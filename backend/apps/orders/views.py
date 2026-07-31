import json
import uuid
from datetime import datetime
from decimal import Decimal
from django.db import transaction
from django.db.models import Exists, OuterRef, Count, Sum, Q
from django.db.models.functions import TruncMonth
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Order, OrderItem, OrderStatusHistory, DeliveryAssignment
from .serializers import OrderSerializer
from apps.accounts.serializers import AdminUserSerializer
from apps.commerce.models import CartItem
from apps.commerce.utils import get_best_offer
from apps.payments.models import Payment
from apps.catalog.models import Product
from apps.accounts.models import User
from apps.serviceability.services import check_postal_code_serviceability


def generate_order_number():
    date_part = datetime.now().strftime('%Y%m%d')
    unique_part = str(uuid.uuid4().hex[:6].upper())
    return f'GNS-{date_part}-{unique_part}'


class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        prefetch = ['items', 'status_history', 'delivery_assignments__assigned_to__profile']
        qs = Order.objects.all().prefetch_related(*prefetch)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(current_status=status_filter)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__lte=date_to)

        if self.request.user.role == 'ADM':
            customer = self.request.query_params.get('customer')
            if customer:
                qs = qs.filter(user__email__icontains=customer)
            return qs

        if self.request.user.role == 'DLV':
            assigned = DeliveryAssignment.objects.filter(
                order_id=OuterRef('id'),
                assigned_to=self.request.user,
            )
            return qs.filter(Exists(assigned))

        return qs.filter(user=self.request.user)

    def _resolve_shipping_address(self, request):
        address_id = request.data.get('address_id')
        if address_id:
            profile = request.user.profile
            for a in profile.addresses:
                if a.get('id') == address_id:
                    return {
                        'shipping_address_line1': a.get('address', ''),
                        'shipping_city': a.get('city', ''),
                        'shipping_state': a.get('state', ''),
                        'shipping_postal_code': a.get('postal_code', ''),
                        'shipping_country': a.get('country', 'India'),
                    }
        return {
            'shipping_address_line1': request.data.get('shipping_address', ''),
            'shipping_city': request.data.get('shipping_city', ''),
            'shipping_state': request.data.get('shipping_state', ''),
            'shipping_postal_code': request.data.get('shipping_postal_code', ''),
            'shipping_country': request.data.get('shipping_country', 'India'),
        }

    @transaction.atomic
    def _build_order_items_from_cart(self, cart_items):
        """Build order_items_data from cart items (existing flow)."""
        subtotal = Decimal('0')
        total_discount = Decimal('0')
        order_items_data = []

        for cart_item in cart_items:
            base_price = cart_item.variant.price if cart_item.variant else cart_item.product.base_price
            variant_name = cart_item.variant.name if cart_item.variant else ''
            subtotal += base_price * cart_item.quantity
            offer, per_unit_discount = get_best_offer(cart_item.product)
            per_unit_discount = Decimal(str(per_unit_discount))
            discounted_unit = base_price - per_unit_discount
            if discounted_unit < 0:
                discounted_unit = Decimal('0')
            item_discount = (per_unit_discount * cart_item.quantity).quantize(Decimal('0.01'))
            total_discount += item_discount
            order_items_data.append({
                'cart_item': cart_item,
                'offer': offer,
                'unit_price': discounted_unit.quantize(Decimal('0.01')),
                'line_total': (discounted_unit * cart_item.quantity).quantize(Decimal('0.01')),
                'discount_amount': item_discount,
                'variant_name': variant_name,
            })

        return subtotal, total_discount, order_items_data

    def _build_order_items_from_request(self, request):
        """Build order_items_data from request data (direct / Buy Now checkout)."""
        raw_items = request.data.getlist('items') if hasattr(request.data, 'getlist') else request.data.get('items', [])
        if isinstance(raw_items, str):
            raw_items = [raw_items]

        subtotal = Decimal('0')
        total_discount = Decimal('0')
        order_items_data = []

        for raw in raw_items:
            if isinstance(raw, str):
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue
            else:
                data = raw

            product_id = data.get('product')
            quantity = int(data.get('quantity', 1))
            variant_id = data.get('variant')
            if not product_id or quantity < 1:
                continue

            product = Product.objects.select_for_update().get(id=product_id)

            # Resolve variant pricing
            variant = None
            variant_name = ''
            base_price = product.base_price
            if variant_id:
                from apps.catalog.models import ProductVariant
                variant = ProductVariant.objects.filter(id=variant_id, product=product, is_active=True).first()
                if variant:
                    base_price = variant.price
                    variant_name = variant.name

            subtotal += base_price * quantity

            offer, per_unit_discount = get_best_offer(product)
            per_unit_discount = Decimal(str(per_unit_discount))
            discounted_unit = base_price - per_unit_discount
            if discounted_unit < 0:
                discounted_unit = Decimal('0')
            item_discount = (per_unit_discount * quantity).quantize(Decimal('0.01'))
            total_discount += item_discount

            # Build a lightweight cart-item-like object
            class DirectItem:
                pass
            cart_item = DirectItem()
            cart_item.product = product
            cart_item.product_id = product.id
            cart_item.quantity = quantity
            cart_item.variant = variant

            order_items_data.append({
                'cart_item': cart_item,
                'offer': offer,
                'unit_price': discounted_unit.quantize(Decimal('0.01')),
                'line_total': (discounted_unit * quantity).quantize(Decimal('0.01')),
                'discount_amount': item_discount,
                'variant_name': variant_name,
            })

        return subtotal, total_discount, order_items_data

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        payment_method = request.data.get('payment_method', 'online')

        customer_gst = getattr(request.user.profile, 'gst_number', '') if hasattr(request.user, 'profile') else ''
        admin_user = User.objects.filter(
            role='ADM',
            is_active=True,
            profile__gst_number__gt=''
        ).select_related('profile').first()
        admin_gst = admin_user.profile.gst_number if admin_user else ''

        cart_items = CartItem.objects.filter(user=request.user).select_related('product', 'variant')
        if cart_items.exists():
            subtotal, total_discount, order_items_data = self._build_order_items_from_cart(cart_items)
        else:
            subtotal, total_discount, order_items_data = self._build_order_items_from_request(request)
            if not order_items_data:
                return Response({'detail': 'Cart is empty'}, status=status.HTTP_400_BAD_REQUEST)

        net_items_total = subtotal - total_discount
        if net_items_total < 0:
            net_items_total = Decimal('0')

        cgst = (net_items_total * Decimal('0.09')).quantize(Decimal('0.01'))
        sgst = (net_items_total * Decimal('0.09')).quantize(Decimal('0.01'))
        total_amount = net_items_total + cgst + sgst

        # Serviceability is enforced on the server so it cannot be bypassed
        # by disabling the browser-side location check.
        addr = self._resolve_shipping_address(request)
        serviceability = check_postal_code_serviceability(addr.get('shipping_postal_code', ''))
        if not serviceability['serviceable']:
            return Response(
                {
                    'detail': serviceability['message'],
                    'code': serviceability['code'],
                    'serviceability': serviceability,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Validate stock for ALL items before deducting (prevent partial deduction) ──
        for data in order_items_data:
            cart_item = data['cart_item']
            if hasattr(cart_item, 'variant') and cart_item.variant:
                variant_ref = cart_item.variant
                # Re-fetch variant for locking
                from apps.catalog.models import ProductVariant
                variant_ref = ProductVariant.objects.select_for_update().get(id=variant_ref.id)
                if variant_ref.stock < cart_item.quantity:
                    return Response(
                        {'detail': f'Insufficient stock for "{cart_item.product.name} ({variant_ref.name})". Available: {variant_ref.stock}, required: {cart_item.quantity}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                product = Product.objects.select_for_update().get(id=cart_item.product_id)
                if product.stock < cart_item.quantity:
                    return Response(
                        {'detail': f'Insufficient stock for "{product.name}". Available: {product.stock}, required: {cart_item.quantity}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
        # ── Deduct stock for all items ──
        for data in order_items_data:
            cart_item = data['cart_item']
            if hasattr(cart_item, 'variant') and cart_item.variant:
                from apps.catalog.models import ProductVariant
                variant_ref = ProductVariant.objects.select_for_update().get(id=cart_item.variant.id)
                variant_ref.stock -= cart_item.quantity
                variant_ref.save(update_fields=['stock'])
            else:
                product = Product.objects.select_for_update().get(id=cart_item.product_id)
                product.stock -= cart_item.quantity
                product.save(update_fields=['stock'])

        order_number = generate_order_number()
        profile = getattr(request.user, 'profile', None)
        order = Order.objects.create(
            user=request.user,
            order_number=order_number,
            current_status='PENDING',
            subtotal=subtotal,
            discount_amount=total_discount,
            cgst_amount=cgst,
            sgst_amount=sgst,
            customer_gst_number=customer_gst,
            admin_gst_number=admin_gst,
            total_amount=total_amount,
            shipping_full_name=request.data.get('shipping_full_name', profile.full_name if profile else ''),
            shipping_phone=request.data.get('shipping_phone', request.user.phone),
            shipping_address_line1=addr.get('shipping_address_line1', ''),
            shipping_address_line2=addr.get('shipping_address_line2', ''),
            shipping_city=addr.get('shipping_city', ''),
            shipping_state=addr.get('shipping_state', ''),
            shipping_postal_code=addr.get('shipping_postal_code', ''),
            shipping_country=addr.get('shipping_country', 'India'),
        )

        for data in order_items_data:
            OrderItem.objects.create(
                order=order,
                product_id=data['cart_item'].product_id,
                product_name=data['cart_item'].product.name,
                product_slug=data['cart_item'].product.slug,
                unit_price=data['unit_price'],
                quantity=data['cart_item'].quantity,
                line_total=data['line_total'],
                applied_offer_id=data['offer'].id if data['offer'] else None,
                applied_offer_name=data['offer'].name if data['offer'] else '',
                discount_amount=data['discount_amount'],
                variant_name=data.get('variant_name', ''),
            )

        OrderStatusHistory.objects.create(
            order=order,
            to_status='PENDING',
            changed_by=request.user,
            remarks='Order placed',
        )

        if payment_method == 'cod':
            payment = Payment.objects.create(
                order=order,
                expected_amount=total_amount,
                current_status='COD',
                chosen_method='cod',
                qr_reference=f'COD-{uuid.uuid4().hex[:8].upper()}',
                expires_at=datetime.now(),
            )
        else:
            payment = Payment.objects.create(
                order=order,
                expected_amount=total_amount,
                qr_reference=f'QR-{uuid.uuid4().hex[:8].upper()}',
                expires_at=datetime.now(),
            )

            config_payment = Payment.objects.filter(order__isnull=True).first()
            if config_payment:
                payment.qr_code_image = config_payment.qr_code_image
                payment.upi_id = config_payment.upi_id
                payment.payment_details = config_payment.payment_details
                payment.save()

        cart_items.delete()

        serializer = self.get_serializer(order)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def reorder(self, request, pk=None):
        order = self.get_object()

        if order.user != request.user:
            return Response({'detail': 'Not your order'}, status=status.HTTP_403_FORBIDDEN)

        if order.current_status != 'DELIVERED':
            return Response({'detail': 'Only delivered orders can be reordered'}, status=status.HTTP_400_BAD_REQUEST)

        CartItem.objects.filter(user=request.user).delete()

        added = []
        skipped = []

        for item in order.items.all():
            product = Product.objects.filter(id=item.product_id).first()

            if not product or not product.is_active or not product.is_available or product.stock < 1:
                skipped.append({'product_name': item.product_name, 'reason': 'No longer available'})
                continue

            qty = item.quantity
            if product.stock < qty:
                skipped.append({'product_name': product.name, 'reason': f'Only {product.stock} in stock (ordered {qty})'})
                qty = product.stock

            cart_item, created = CartItem.objects.get_or_create(
                user=request.user,
                product=product,
                defaults={'quantity': qty},
            )
            if not created:
                cart_item.quantity += qty
                cart_item.save()

            added.append({'product_name': product.name, 'quantity': cart_item.quantity})

        cart_count = CartItem.objects.filter(user=request.user).count()

        return Response({
            'added': added,
            'skipped': skipped,
            'cart_count': cart_count,
        })

    def _is_cod_order(self, order):
        try:
            return order.payment.chosen_method == 'cod'
        except Exception:
            return False

    def _update_delivery_assignment(self, order, status, user):
        """Update the active DeliveryAssignment based on status transition."""
        active = order.delivery_assignments.filter(completed_at__isnull=True).first()
        if not active:
            return
        now = datetime.now()
        if status == 'SHIPPED':
            if not active.started_at:
                active.started_at = now
                active.save(update_fields=['started_at'])
        elif status == 'DELIVERED':
            active.completed_at = now
            if not active.started_at:
                active.started_at = now
            active.save(update_fields=['completed_at', 'started_at'])

    @action(detail=True, methods=['patch'])
    @transaction.atomic
    def update_status(self, request, pk=None):
        order = self.get_object()
        new_status = request.data.get('status')
        if new_status not in dict(Order.STATUS_CHOICES):
            return Response({'detail': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = order.current_status
        user_role = request.user.role

        if user_role == 'DLV':
            active = order.delivery_assignments.filter(assigned_to=request.user, completed_at__isnull=True)
            if not active.exists():
                return Response({'detail': 'This order is not assigned to you'}, status=status.HTTP_403_FORBIDDEN)
            allowed_dlv = [('PROCESSING', 'SHIPPED'), ('SHIPPED', 'DELIVERED')]
            if (old_status, new_status) not in allowed_dlv:
                return Response({'detail': f'You can only transition {", ".join(f"{a}→{b}" for a,b in allowed_dlv)}'}, status=status.HTTP_400_BAD_REQUEST)

        is_cod = self._is_cod_order(order)

        if is_cod:
            allowed_cod_transitions = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']
            if new_status not in allowed_cod_transitions:
                return Response({'detail': 'Invalid status transition for COD order'}, status=status.HTTP_400_BAD_REQUEST)

        order.current_status = new_status

        if new_status == 'PROCESSING' and old_status != 'PROCESSING':
            for item in order.items.all():
                product = Product.objects.select_for_update().get(id=item.product_id)
                if product.stock < item.quantity:
                    return Response(
                        {'detail': f'Insufficient stock for "{product.name}". Available: {product.stock}, required: {item.quantity}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                product.stock -= item.quantity
                product.save(update_fields=['stock'])

        # ── Restore stock when order is CANCELLED after stock was deducted ──
        stock_deducted_statuses = {'PROCESSING', 'SHIPPED', 'DELIVERED'}
        if new_status == 'CANCELLED' and old_status in stock_deducted_statuses:
            for item in order.items.all():
                product = Product.objects.select_for_update().get(id=item.product_id)
                product.stock += item.quantity
                product.save(update_fields=['stock'])

        self._update_delivery_assignment(order, new_status, request.user)

        order.save()

        OrderStatusHistory.objects.create(
            order=order,
            from_status=old_status,
            to_status=new_status,
            changed_by=request.user,
            remarks=request.data.get('remarks', ''),
        )

        order.refresh_from_db()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def assign_delivery(self, request, pk=None):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can assign deliveries'}, status=status.HTTP_403_FORBIDDEN)
        order = self.get_object()
        delivery_person_id = request.data.get('delivery_person_id')
        if not delivery_person_id:
            return Response({'detail': 'delivery_person_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        from apps.accounts.models import User
        try:
            person = User.objects.get(id=delivery_person_id, role='DLV')
        except User.DoesNotExist:
            return Response({'detail': 'Delivery person not found'}, status=status.HTTP_404_NOT_FOUND)

        old_status = order.current_status
        if old_status == 'PENDING':
            for item in order.items.all():
                product = Product.objects.select_for_update().get(id=item.product_id)
                if product.stock < item.quantity:
                    return Response(
                        {'detail': f'Insufficient stock for "{product.name}". Available: {product.stock}, required: {item.quantity}'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                product.stock -= item.quantity
                product.save(update_fields=['stock'])
            order.current_status = 'PROCESSING'
            order.save()

        DeliveryAssignment.objects.create(
            order=order,
            assigned_to=person,
            assigned_by=request.user,
        )

        if old_status == 'PENDING':
            OrderStatusHistory.objects.create(
                order=order,
                from_status='PENDING',
                to_status='PROCESSING',
                changed_by=request.user,
                remarks=f'Assigned to {person.email}',
            )

        OrderStatusHistory.objects.create(
            order=order,
            from_status=old_status,
            to_status=order.current_status,
            changed_by=request.user,
            remarks=f'Delivery assigned to {person.email}',
        )

        order.refresh_from_db()
        serializer = self.get_serializer(order)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_deliveries(self, request):
        if request.user.role != 'DLV':
            return Response({'detail': 'Only delivery persons can access this'}, status=status.HTTP_403_FORBIDDEN)
        from django.utils import timezone
        today = timezone.now().date()
        assigned_ids = DeliveryAssignment.objects.filter(assigned_to=request.user).values('order_id')
        orders = Order.objects.filter(id__in=assigned_ids).distinct().prefetch_related('items', 'status_history', 'delivery_assignments__assigned_to__profile')

        stats = {
            'assigned_today': orders.filter(
                delivery_assignments__assigned_to=request.user,
                delivery_assignments__created_at__date=today,
            ).distinct().count(),
            'active': orders.exclude(current_status__in=['DELIVERED', 'CANCELLED']).count(),
            'completed_today': orders.filter(
                current_status='DELIVERED',
                delivery_assignments__assigned_to=request.user,
                delivery_assignments__completed_at__date=today,
            ).distinct().count(),
        }

        serializer = self.get_serializer(orders, many=True)
        return Response({'orders': serializer.data, 'stats': stats})

    @action(detail=False, methods=['get'])
    def delivery_persons(self, request):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can view delivery persons'}, status=status.HTTP_403_FORBIDDEN)
        from apps.accounts.models import User
        persons = User.objects.filter(role='DLV').select_related('profile')
        serializer = AdminUserSerializer(persons, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def analytics(self, request):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can access analytics'}, status=status.HTTP_403_FORBIDDEN)

        # Parse filter params
        date_from = request.query_params.get('from')
        date_to = request.query_params.get('to')
        status_filter = request.query_params.get('status')

        qs = Order.objects.all()
        if date_from:
            qs = qs.filter(created_at__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__lte=date_to)
        if status_filter:
            qs = qs.filter(current_status=status_filter)

        # ── Summary ──
        summary_data = qs.aggregate(
            total_revenue=Sum('total_amount'),
            total_orders=Count('id'),
        )
        total_orders = summary_data['total_orders'] or 0
        total_revenue = summary_data['total_revenue'] or 0
        avg_order_value = total_revenue / total_orders if total_orders else 0
        summary = {
            'total_revenue': float(total_revenue),
            'total_orders': total_orders,
            'avg_order_value': float(round(avg_order_value, 2)),
        }

        # ── Products stats ──
        active_products = Product.objects.filter(is_active=True).count()
        total_products = Product.objects.count()
        out_of_stock = Product.objects.filter(stock=0).count()
        products = {
            'active': active_products,
            'total': total_products,
            'out_of_stock': out_of_stock,
        }

        # ── Users stats ──
        from apps.accounts.models import User
        total_users = User.objects.count()
        if date_from:
            new_users = User.objects.filter(date_joined__gte=date_from).count()
        else:
            new_users = User.objects.count()
        users = {
            'total': total_users,
            'new': new_users,
        }

        # ── Status breakdown ──
        status_breakdown = []
        for code, _ in Order.STATUS_CHOICES:
            count = qs.filter(current_status=code).count()
            if count > 0:
                status_breakdown.append({'status': code, 'count': count})

        # ── Monthly revenue ──
        monthly_qs = (
            qs
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(
                revenue=Sum('total_amount'),
                count=Count('id'),
            )
            .order_by('month')
        )
        monthly_revenue = [
            {
                'month': item['month'].strftime('%b %Y') if item['month'] else 'N/A',
                'revenue': float(item['revenue'] or 0),
                'count': item['count'],
            }
            for item in monthly_qs
        ]

        # ── Top products ──
        top_products_qs = (
            OrderItem.objects
            .filter(order__in=qs)
            .values('product_id', 'product_name', 'product_slug')
            .annotate(
                total_qty=Sum('quantity'),
                total_revenue=Sum('line_total'),
            )
            .order_by('-total_qty')[:10]
        )
        top_products = [
            {
                'product_id': str(item['product_id']),
                'product_name': item['product_name'],
                'product_slug': item['product_slug'],
                'total_qty': item['total_qty'],
                'total_revenue': float(item['total_revenue'] or 0),
            }
            for item in top_products_qs
        ]

        # ── Recent orders ──
        recent = qs.order_by('-created_at')[:10]
        serializer = OrderSerializer(recent, many=True, context={'request': request})

        return Response({
            'summary': summary,
            'products': products,
            'users': users,
            'status_breakdown': status_breakdown,
            'monthly_revenue': monthly_revenue,
            'top_products': top_products,
            'recent_orders': serializer.data,
        })
