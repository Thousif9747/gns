from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.utils import timezone
from django.core.files.base import ContentFile
import uuid
from fpdf import FPDF
from .models import Payment, PaymentProof, PaymentStatusHistory, Receipt
from .serializers import PaymentSerializer, PaymentProofSerializer, ReceiptSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        if self.request.user.role == 'ADM':
            qs = Payment.objects.all()
            status_filter = self.request.query_params.get('status')
            if status_filter:
                qs = qs.filter(current_status=status_filter)
            method_filter = self.request.query_params.get('method')
            if method_filter:
                qs = qs.filter(chosen_method=method_filter)
            return qs
        return Payment.objects.filter(order__user=self.request.user)

    @action(detail=True, methods=['post'])
    def upload_proof(self, request, pk=None):
        payment = self.get_object()
        if payment.current_status not in ('INITIATED', 'PROOF_UPLOADED', 'REJECTED'):
            return Response({'detail': 'Cannot upload proof for this payment'}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES.get('file')
        if not uploaded_file:
            return Response({'detail': 'file is required'}, status=status.HTTP_400_BAD_REQUEST)

        ext = uploaded_file.name.split('.')[-1].lower() if '.' in uploaded_file.name else ''
        if ext in ('jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'):
            file_type = 'image'
        elif ext == 'pdf':
            file_type = 'pdf'
        else:
            file_type = 'document'

        PaymentProof.objects.filter(payment=payment, is_current=True).update(is_current=False)

        proof = PaymentProof.objects.create(
            payment=payment,
            file=uploaded_file,
            original_filename=uploaded_file.name,
            file_type=file_type,
            file_size_bytes=uploaded_file.size,
            customer_notes=request.data.get('customer_notes', ''),
            uploaded_by=request.user,
            is_current=True,
        )

        old_status = payment.current_status
        payment.current_status = 'PROOF_UPLOADED'
        payment.claimed_amount = request.data.get('claimed_amount', None)
        chosen_method = request.data.get('chosen_method', '')
        if chosen_method:
            payment.chosen_method = chosen_method
        payment.save()

        payment.order.current_status = 'PAYMENT_UPLOADED'
        payment.order.save()

        PaymentStatusHistory.objects.create(
            payment=payment,
            from_status=old_status,
            to_status='PROOF_UPLOADED',
            changed_by=request.user,
            proof=proof,
            remarks='Payment proof uploaded',
        )

        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can review payments'}, status=status.HTTP_403_FORBIDDEN)

        payment = self.get_object()
        decision = request.data.get('decision')
        remarks = request.data.get('remarks', '')

        if decision not in ('APPROVED', 'REJECTED'):
            return Response({'detail': 'Decision must be APPROVED or REJECTED'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = payment.current_status
        payment.current_status = decision
        payment.admin_remarks = remarks
        payment.reviewed_by = request.user
        payment.reviewed_at = timezone.now()
        payment.save()

        new_order_status = 'PAYMENT_APPROVED' if decision == 'APPROVED' else 'PAYMENT_REJECTED'
        payment.order.current_status = new_order_status
        payment.order.save()

        if decision == 'APPROVED':
            receipt_exists = Receipt.objects.filter(order=payment.order).exists()
            if not receipt_exists:
                order = payment.order
                items = order.items.all()

                method_label = payment.chosen_method.replace('_', ' ').title() if payment.chosen_method else 'N/A'

                method_color_r, method_color_g, method_color_b = 59, 130, 246  # blue for QR
                if 'upi' in (payment.chosen_method or ''):
                    method_color_r, method_color_g, method_color_b = 5, 150, 105  # green for UPI
                elif 'bank' in (payment.chosen_method or ''):
                    method_color_r, method_color_g, method_color_b = 124, 58, 237  # purple for bank

                pdf = FPDF(orientation='P', unit='mm', format='A4')
                pdf.set_auto_page_break(auto=True, margin=20)
                pdf.add_page()
                pdf.add_font('DejaVu', '', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', uni=True)
                pdf.add_font('DejaVu', 'B', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', uni=True)
                lm, rm = 20, 20
                pdf.set_left_margin(lm)
                pdf.set_right_margin(rm)
                pw = 210 - lm - rm  # page width usable

                # Brand colors
                pr, pg, pb = 58, 125, 68  # #3A7D44 primary
                dr, dg, db = 17, 24, 39   # #111827 dark
                gr, gg, gb = 107, 114, 128  # #6B7280 gray
                tr, tg, tb = 55, 65, 81    # #374151 text

                # === HEADER ===
                pdf.set_font('DejaVu', 'B', 22)
                pdf.set_text_color(pr, pg, pb)
                pdf.cell(0, 10, 'GNS', align='C', ln=1)

                pdf.set_font('DejaVu', 'B', 16)
                pdf.set_text_color(dr, dg, db)
                pdf.cell(0, 8, 'Payment Receipt', align='C', ln=1)

                pdf.set_font('DejaVu', '', 9)
                pdf.set_text_color(gr, gg, gb)
                pdf.cell(0, 5, f'Receipt #  {order.order_number}', align='C', ln=1)
                pdf.cell(0, 5, order.created_at.strftime('%d %B %Y, %I:%M %p'), align='C', ln=1)

                pdf.set_draw_color(pr, pg, pb)
                pdf.set_line_width(0.6)
                y_line = pdf.get_y() + 2
                pdf.line(lm, y_line, lm + pw, y_line)
                pdf.ln(7)

                # === SHIPPING ADDRESS ===
                pdf.set_font('DejaVu', 'B', 7)
                pdf.set_text_color(gr, gg, gb)
                pdf.cell(0, 5, 'SHIPPING ADDRESS', ln=1)

                address_lines = [order.shipping_full_name or '']
                if order.shipping_phone:
                    address_lines.append(order.shipping_phone)
                if order.shipping_address_line1:
                    address_lines.append(order.shipping_address_line1)
                if order.shipping_address_line2:
                    address_lines.append(order.shipping_address_line2)
                city_line = ', '.join(filter(None, [
                    order.shipping_city,
                    order.shipping_state,
                    order.shipping_postal_code,
                ]))
                if city_line:
                    address_lines.append(city_line)
                if order.shipping_country:
                    address_lines.append(order.shipping_country)

                # address block background
                y_addr_start = pdf.get_y()
                addr_height = len(address_lines) * 6 + 4
                pdf.set_fill_color(240, 247, 240)  # primary_light
                pdf.rect(lm, y_addr_start, pw, addr_height, 'F')
                # green left border
                pdf.set_fill_color(pr, pg, pb)
                pdf.rect(lm, y_addr_start, 1.5, addr_height, 'F')

                pdf.set_xy(lm + 5, y_addr_start + 2)
                pdf.set_font('DejaVu', 'B', 10)
                pdf.set_text_color(dr, dg, db)
                pdf.cell(0, 6, address_lines[0], ln=1)
                pdf.set_font('DejaVu', '', 9)
                pdf.set_text_color(tr, tg, tb)
                for line in address_lines[1:]:
                    pdf.set_x(lm + 5)
                    pdf.cell(0, 6, line, ln=1)

                pdf.set_y(y_addr_start + addr_height + 5)

                # === GST INFORMATION ===
                gst_items = []
                if order.customer_gst_number:
                    gst_items.append(('Customer GSTIN', order.customer_gst_number))
                if order.admin_gst_number:
                    gst_items.append(('Seller GSTIN', order.admin_gst_number))

                if gst_items:
                    pdf.set_font('DejaVu', 'B', 7)
                    pdf.set_text_color(gr, gg, gb)
                    pdf.cell(0, 5, 'GST INFORMATION', ln=1)

                    y_gst_start = pdf.get_y()
                    gst_height = len(gst_items) * 6 + 4
                    pdf.set_fill_color(249, 250, 251)
                    pdf.rect(lm, y_gst_start, pw, gst_height, 'F')
                    pdf.set_fill_color(pr, pg, pb)
                    pdf.rect(lm, y_gst_start, 1.5, gst_height, 'F')

                    pdf.set_xy(lm + 5, y_gst_start + 2)
                    pdf.set_font('DejaVu', '', 9)
                    pdf.set_text_color(tr, tg, tb)
                    for label, value in gst_items:
                        pdf.set_x(lm + 5)
                        pdf.cell(40, 6, label + ':', align='L')
                        pdf.set_font('DejaVu', 'B', 9)
                        pdf.cell(0, 6, value, align='L', ln=1)
                        pdf.set_font('DejaVu', '', 9)

                    pdf.set_y(y_gst_start + gst_height + 5)
                else:
                    pdf.ln(3)

                # === ORDER ITEMS TABLE ===
                pdf.set_font('DejaVu', 'B', 7)
                pdf.set_text_color(gr, gg, gb)
                pdf.cell(0, 5, 'ORDER ITEMS', ln=1)
                pdf.ln(2)

                # Table header
                col_w = [pw * 0.45, pw * 0.12, pw * 0.20, pw * 0.23]
                pdf.set_fill_color(pr, pg, pb)
                pdf.set_text_color(255, 255, 255)
                pdf.set_font('DejaVu', 'B', 8)
                headers = ['Item', 'Qty', 'Price', 'Total']
                aligns = ['L', 'C', 'R', 'R']
                x_start = pdf.get_x()
                for i, h in enumerate(headers):
                    pdf.cell(col_w[i], 7, h, border=0, align=aligns[i], fill=True)
                pdf.ln()

                # Table rows
                pdf.set_text_color(tr, tg, tb)
                pdf.set_font('DejaVu', '', 9)
                for item in items:
                    pdf.set_x(x_start)
                    pdf.cell(col_w[0], 6, item.product_name[:50], align='L')
                    pdf.cell(col_w[1], 6, str(item.quantity), align='C')
                    pdf.cell(col_w[2], 6, f'\u20b9 {item.unit_price:,.2f}', align='R')
                    pdf.cell(col_w[3], 6, f'\u20b9 {item.line_total:,.2f}', align='R')
                    pdf.ln()

                # Line under items
                pdf.set_draw_color(229, 231, 235)
                pdf.line(lm, pdf.get_y(), lm + pw, pdf.get_y())
                pdf.ln(3)

                # === TOTALS ===
                tot_left = lm + pw * 0.55
                tot_width = pw * 0.45
                pdf.set_x(tot_left)
                pdf.set_font('DejaVu', '', 9)
                pdf.set_text_color(gr, gg, gb)
                pdf.cell(tot_width, 6, 'Subtotal', align='L')
                pdf.set_text_color(tr, tg, tb)
                pdf.cell(0, 6, f'\u20b9 {order.subtotal:,.2f}', align='R', ln=1)

                if float(order.discount_amount or 0) > 0:
                    pdf.set_x(tot_left)
                    pdf.set_text_color(5, 150, 105)
                    pdf.set_font('DejaVu', '', 9)
                    pdf.cell(tot_width, 6, 'Discount', align='L')
                    pdf.cell(0, 6, f'-\u20b9 {order.discount_amount:,.2f}', align='R', ln=1)

                pdf.set_x(tot_left)
                pdf.set_text_color(gr, gg, gb)
                pdf.set_font('DejaVu', '', 9)
                pdf.cell(tot_width, 6, 'CGST (9%)', align='L')
                pdf.set_text_color(tr, tg, tb)
                pdf.cell(0, 6, f'\u20b9 {order.cgst_amount:,.2f}', align='R', ln=1)

                pdf.set_x(tot_left)
                pdf.set_text_color(gr, gg, gb)
                pdf.set_font('DejaVu', '', 9)
                pdf.cell(tot_width, 6, 'SGST (9%)', align='L')
                pdf.set_text_color(tr, tg, tb)
                pdf.cell(0, 6, f'\u20b9 {order.sgst_amount:,.2f}', align='R', ln=1)

                pdf.set_x(tot_left)
                pdf.set_text_color(gr, gg, gb)
                pdf.set_font('DejaVu', '', 9)
                pdf.cell(tot_width, 6, 'Shipping', align='L')
                pdf.set_text_color(5, 150, 105)
                pdf.set_font('DejaVu', 'B', 9)
                pdf.cell(0, 6, 'FREE', align='R', ln=1)

                # Total line
                pdf.set_draw_color(pr, pg, pb)
                pdf.set_line_width(0.5)
                y_tot = pdf.get_y()
                pdf.line(tot_left, y_tot, tot_left + tot_width, y_tot)
                pdf.ln(2)

                pdf.set_x(tot_left)
                pdf.set_font('DejaVu', 'B', 11)
                pdf.set_text_color(dr, dg, db)
                pdf.cell(tot_width, 7, 'Total Paid', align='L')
                pdf.set_text_color(pr, pg, pb)
                pdf.cell(0, 7, f'\u20b9 {order.total_amount:,.2f}', align='R', ln=1)

                pdf.ln(5)

                # === PAYMENT INFO ===
                pdf.set_fill_color(249, 250, 251)  # #F9FAFB
                y_pay = pdf.get_y()
                pay_h = 16
                pdf.rect(lm, y_pay, pw, pay_h, 'F')
                pdf.set_xy(lm + 5, y_pay + 2)
                pdf.set_font('DejaVu', '', 9)
                pdf.set_text_color(tr, tg, tb)
                pdf.cell(35, 5, 'Payment Method:', align='L')
                # method badge
                pdf.set_fill_color(method_color_r, method_color_g, method_color_b)
                pdf.set_text_color(255, 255, 255)
                pdf.set_font('DejaVu', 'B', 8)
                pdf.cell(35, 5, f'  {method_label}  ', align='C', fill=True)
                pdf.ln(6)

                pdf.set_x(lm + 5)
                pdf.set_font('DejaVu', '', 9)
                pdf.set_text_color(tr, tg, tb)
                pdf.cell(35, 5, 'Status:', align='L')
                pdf.set_fill_color(5, 150, 105)
                pdf.set_text_color(255, 255, 255)
                pdf.set_font('DejaVu', 'B', 8)
                pdf.cell(25, 5, '  Paid  ', align='C', fill=True)

                pdf.set_y(y_pay + pay_h + 8)

                # === FOOTER ===
                pdf.set_draw_color(229, 231, 235)
                pdf.line(lm, pdf.get_y(), lm + pw, pdf.get_y())
                pdf.ln(4)

                pdf.set_font('DejaVu', 'B', 9)
                pdf.set_text_color(pr, pg, pb)
                pdf.cell(0, 5, 'Thank you for your order!', align='C', ln=1)

                pdf.set_font('DejaVu', '', 7)
                pdf.set_text_color(156, 163, 175)
                pdf.cell(0, 4, f'{order.order_number}  |  Generated on {timezone.now().strftime("%d %B %Y, %I:%M %p")}', align='C', ln=1)

                pdf_bytes = bytes(pdf.output())

                pdf_filename = f'receipt_{order.order_number}.pdf'
                receipt = Receipt(order=order, original_filename=pdf_filename, file_type='pdf')
                receipt.file.save(pdf_filename, ContentFile(pdf_bytes))
                receipt.save()

        PaymentStatusHistory.objects.create(
            payment=payment,
            from_status=old_status,
            to_status=decision,
            changed_by=request.user,
            remarks=remarks,
        )

        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def mark_collected(self, request, pk=None):
        if request.user.role != 'ADM':
            return Response({'detail': 'Only admins can mark COD as collected'}, status=status.HTTP_403_FORBIDDEN)

        payment = self.get_object()
        if payment.chosen_method != 'cod':
            return Response({'detail': 'Not a COD payment'}, status=status.HTTP_400_BAD_REQUEST)
        if payment.current_status != 'COD':
            return Response({'detail': 'Payment is already collected or not in COD pending state'}, status=status.HTTP_400_BAD_REQUEST)

        old_status = payment.current_status
        payment.current_status = 'COLLECTED'
        payment.reviewed_by = request.user
        payment.reviewed_at = timezone.now()
        payment.save()

        PaymentStatusHistory.objects.create(
            payment=payment,
            from_status=old_status,
            to_status='COLLECTED',
            changed_by=request.user,
            remarks=request.data.get('remarks', 'Payment collected on delivery'),
        )

        receipt_exists = Receipt.objects.filter(order=payment.order).exists()
        if not receipt_exists:
            self._generate_receipt(payment)

        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    def _generate_receipt(self, payment):
        order = payment.order
        items = order.items.all()

        method_label = 'Cash on Delivery'
        method_color_r, method_color_g, method_color_b = 245, 158, 11

        pdf = FPDF(orientation='P', unit='mm', format='A4')
        pdf.set_auto_page_break(auto=True, margin=20)
        pdf.add_page()
        pdf.add_font('DejaVu', '', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', uni=True)
        pdf.add_font('DejaVu', 'B', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', uni=True)
        lm, rm = 20, 20
        pdf.set_left_margin(lm)
        pdf.set_right_margin(rm)
        pw = 210 - lm - rm

        pr, pg, pb = 58, 125, 68
        dr, dg, db = 17, 24, 39
        gr, gg, gb = 107, 114, 128
        tr, tg, tb = 55, 65, 81

        pdf.set_font('DejaVu', 'B', 22)
        pdf.set_text_color(pr, pg, pb)
        pdf.cell(0, 10, 'GNS', align='C', ln=1)

        pdf.set_font('DejaVu', 'B', 16)
        pdf.set_text_color(dr, dg, db)
        pdf.cell(0, 8, 'Payment Receipt', align='C', ln=1)

        pdf.set_font('DejaVu', '', 9)
        pdf.set_text_color(gr, gg, gb)
        pdf.cell(0, 5, f'Receipt #  {order.order_number}', align='C', ln=1)
        pdf.cell(0, 5, order.created_at.strftime('%d %B %Y, %I:%M %p'), align='C', ln=1)

        pdf.set_draw_color(pr, pg, pb)
        pdf.set_line_width(0.6)
        y_line = pdf.get_y() + 2
        pdf.line(lm, y_line, lm + pw, y_line)
        pdf.ln(7)

        pdf.set_font('DejaVu', 'B', 7)
        pdf.set_text_color(gr, gg, gb)
        pdf.cell(0, 5, 'SHIPPING ADDRESS', ln=1)

        address_lines = [order.shipping_full_name or '']
        if order.shipping_phone:
            address_lines.append(order.shipping_phone)
        if order.shipping_address_line1:
            address_lines.append(order.shipping_address_line1)
        if order.shipping_address_line2:
            address_lines.append(order.shipping_address_line2)
        city_line = ', '.join(filter(None, [
            order.shipping_city, order.shipping_state, order.shipping_postal_code,
        ]))
        if city_line:
            address_lines.append(city_line)
        if order.shipping_country:
            address_lines.append(order.shipping_country)

        y_addr_start = pdf.get_y()
        addr_height = len(address_lines) * 6 + 4
        pdf.set_fill_color(240, 247, 240)
        pdf.rect(lm, y_addr_start, pw, addr_height, 'F')
        pdf.set_fill_color(pr, pg, pb)
        pdf.rect(lm, y_addr_start, 1.5, addr_height, 'F')

        pdf.set_xy(lm + 5, y_addr_start + 2)
        pdf.set_font('DejaVu', 'B', 10)
        pdf.set_text_color(dr, dg, db)
        pdf.cell(0, 6, address_lines[0], ln=1)
        pdf.set_font('DejaVu', '', 9)
        pdf.set_text_color(tr, tg, tb)
        for line in address_lines[1:]:
            pdf.set_x(lm + 5)
            pdf.cell(0, 6, line, ln=1)

        pdf.set_y(y_addr_start + addr_height + 5)

        # === GST INFORMATION ===
        gst_items = []
        if order.customer_gst_number:
            gst_items.append(('Customer GSTIN', order.customer_gst_number))
        if order.admin_gst_number:
            gst_items.append(('Seller GSTIN', order.admin_gst_number))

        if gst_items:
            pdf.set_font('DejaVu', 'B', 7)
            pdf.set_text_color(gr, gg, gb)
            pdf.cell(0, 5, 'GST INFORMATION', ln=1)

            y_gst_start = pdf.get_y()
            gst_height = len(gst_items) * 6 + 4
            pdf.set_fill_color(249, 250, 251)
            pdf.rect(lm, y_gst_start, pw, gst_height, 'F')
            pdf.set_fill_color(pr, pg, pb)
            pdf.rect(lm, y_gst_start, 1.5, gst_height, 'F')

            pdf.set_xy(lm + 5, y_gst_start + 2)
            pdf.set_font('DejaVu', '', 9)
            pdf.set_text_color(tr, tg, tb)
            for label, value in gst_items:
                pdf.set_x(lm + 5)
                pdf.cell(40, 6, label + ':', align='L')
                pdf.set_font('DejaVu', 'B', 9)
                pdf.cell(0, 6, value, align='L', ln=1)
                pdf.set_font('DejaVu', '', 9)

            pdf.set_y(y_gst_start + gst_height + 5)
        else:
            pdf.ln(3)

        pdf.set_font('DejaVu', 'B', 7)
        pdf.set_text_color(gr, gg, gb)
        pdf.cell(0, 5, 'ORDER ITEMS', ln=1)
        pdf.ln(2)

        col_w = [pw * 0.45, pw * 0.12, pw * 0.20, pw * 0.23]
        pdf.set_fill_color(pr, pg, pb)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('DejaVu', 'B', 8)
        headers = ['Item', 'Qty', 'Price', 'Total']
        aligns = ['L', 'C', 'R', 'R']
        x_start = pdf.get_x()
        for i, h in enumerate(headers):
            pdf.cell(col_w[i], 7, h, border=0, align=aligns[i], fill=True)
        pdf.ln()

        pdf.set_text_color(tr, tg, tb)
        pdf.set_font('DejaVu', '', 9)
        for item in items:
            pdf.set_x(x_start)
            pdf.cell(col_w[0], 6, item.product_name[:50], align='L')
            pdf.cell(col_w[1], 6, str(item.quantity), align='C')
            pdf.cell(col_w[2], 6, f'\u20b9 {item.unit_price:,.2f}', align='R')
            pdf.cell(col_w[3], 6, f'\u20b9 {item.line_total:,.2f}', align='R')
            pdf.ln()

        pdf.set_draw_color(229, 231, 235)
        pdf.line(lm, pdf.get_y(), lm + pw, pdf.get_y())
        pdf.ln(3)

        tot_left = lm + pw * 0.55
        tot_width = pw * 0.45

        pdf.set_x(tot_left)
        pdf.set_font('DejaVu', '', 9)
        pdf.set_text_color(gr, gg, gb)
        pdf.cell(tot_width, 6, 'Subtotal', align='L')
        pdf.set_text_color(tr, tg, tb)
        pdf.cell(0, 6, f'\u20b9 {order.subtotal:,.2f}', align='R', ln=1)

        if float(order.discount_amount or 0) > 0:
            pdf.set_x(tot_left)
            pdf.set_text_color(5, 150, 105)
            pdf.set_font('DejaVu', '', 9)
            pdf.cell(tot_width, 6, 'Discount', align='L')
            pdf.cell(0, 6, f'-\u20b9 {order.discount_amount:,.2f}', align='R', ln=1)

        pdf.set_x(tot_left)
        pdf.set_text_color(gr, gg, gb)
        pdf.set_font('DejaVu', '', 9)
        pdf.cell(tot_width, 6, 'CGST (9%)', align='L')
        pdf.set_text_color(tr, tg, tb)
        pdf.cell(0, 6, f'\u20b9 {order.cgst_amount:,.2f}', align='R', ln=1)

        pdf.set_x(tot_left)
        pdf.set_text_color(gr, gg, gb)
        pdf.set_font('DejaVu', '', 9)
        pdf.cell(tot_width, 6, 'SGST (9%)', align='L')
        pdf.set_text_color(tr, tg, tb)
        pdf.cell(0, 6, f'\u20b9 {order.sgst_amount:,.2f}', align='R', ln=1)

        pdf.set_x(tot_left)
        pdf.set_text_color(gr, gg, gb)
        pdf.set_font('DejaVu', '', 9)
        pdf.cell(tot_width, 6, 'Shipping', align='L')
        pdf.set_text_color(5, 150, 105)
        pdf.set_font('DejaVu', 'B', 9)
        pdf.cell(0, 6, 'FREE', align='R', ln=1)

        pdf.set_draw_color(pr, pg, pb)
        pdf.set_line_width(0.5)
        y_tot = pdf.get_y()
        pdf.line(tot_left, y_tot, tot_left + tot_width, y_tot)
        pdf.ln(2)

        pdf.set_x(tot_left)
        pdf.set_font('DejaVu', 'B', 11)
        pdf.set_text_color(dr, dg, db)
        pdf.cell(tot_width, 7, 'Total', align='L')
        pdf.set_text_color(pr, pg, pb)
        pdf.cell(0, 7, f'\u20b9 {order.total_amount:,.2f}', align='R', ln=1)

        pdf.ln(5)

        pdf.set_fill_color(249, 250, 251)
        y_pay = pdf.get_y()
        pay_h = 16
        pdf.rect(lm, y_pay, pw, pay_h, 'F')
        pdf.set_xy(lm + 5, y_pay + 2)
        pdf.set_font('DejaVu', '', 9)
        pdf.set_text_color(tr, tg, tb)
        pdf.cell(35, 5, 'Payment Method:', align='L')
        pdf.set_fill_color(method_color_r, method_color_g, method_color_b)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('DejaVu', 'B', 8)
        pdf.cell(35, 5, f'  {method_label}  ', align='C', fill=True)
        pdf.ln(6)

        pdf.set_x(lm + 5)
        pdf.set_font('DejaVu', '', 9)
        pdf.set_text_color(tr, tg, tb)
        pdf.cell(35, 5, 'Status:', align='L')
        pdf.set_fill_color(5, 150, 105)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('DejaVu', 'B', 8)
        pdf.cell(25, 5, '  Paid  ', align='C', fill=True)

        pdf.set_y(y_pay + pay_h + 8)

        pdf.set_draw_color(229, 231, 235)
        pdf.line(lm, pdf.get_y(), lm + pw, pdf.get_y())
        pdf.ln(4)

        pdf.set_font('DejaVu', 'B', 9)
        pdf.set_text_color(pr, pg, pb)
        pdf.cell(0, 5, 'Thank you for your order!', align='C', ln=1)

        pdf.set_font('DejaVu', '', 7)
        pdf.set_text_color(156, 163, 175)
        pdf.cell(0, 4, f'{order.order_number}  |  Generated on {timezone.now().strftime("%d %B %Y, %I:%M %p")}', align='C', ln=1)

        pdf_bytes = bytes(pdf.output())
        pdf_filename = f'receipt_{order.order_number}.pdf'
        receipt = Receipt(order=order, original_filename=pdf_filename, file_type='pdf')
        receipt.file.save(pdf_filename, ContentFile(pdf_bytes))
        receipt.save()

    @action(detail=True, methods=['get'])
    def download_receipt(self, request, pk=None):
        payment = self.get_object()
        receipt = Receipt.objects.filter(order=payment.order).first()
        if not receipt:
            return Response({'detail': 'Receipt not generated yet'}, status=status.HTTP_404_NOT_FOUND)

        from django.http import FileResponse
        response = FileResponse(
            receipt.file.open(),
            as_attachment=True,
            filename=receipt.original_filename,
            content_type='application/pdf'
        )
        response['Content-Disposition'] = f'attachment; filename="{receipt.original_filename}"'
        return response

    @action(detail=False, methods=['get', 'patch'])
    def config(self, request):
        # Admin can update the config
        if request.method == 'PATCH':
            if request.user.role != 'ADM':
                return Response({'detail': 'Only admins can update payment config'}, status=status.HTTP_403_FORBIDDEN)

            image = request.FILES.get('qr_code_image')
            upi_id = request.data.get('upi_id', '')
            payment_details = request.data.get('payment_details', '')

            # Find or create the config Payment record (order=None = config holder)
            payment = Payment.objects.filter(order__isnull=True).first()

            if not payment:
                payment = Payment.objects.create(
                    order=None,
                    expected_amount=0,
                    qr_reference=f'CONFIG-{uuid.uuid4().hex[:8].upper()}',
                    expires_at=timezone.now(),
                )

            if image:
                payment.qr_code_image = image
            if 'upi_id' in request.data:
                payment.upi_id = upi_id
            if 'payment_details' in request.data:
                payment.payment_details = payment_details
            payment.save()

            return Response({
                'qr_code_image': request.build_absolute_uri(payment.qr_code_image.url) if payment.qr_code_image else None,
                'upi_id': payment.upi_id or '',
                'payment_details': payment.payment_details or '',
            })

        # GET — public, returns current config
        payment = Payment.objects.filter(order__isnull=True).first()

        return Response({
            'qr_code_image': request.build_absolute_uri(payment.qr_code_image.url) if payment and payment.qr_code_image else None,
            'upi_id': payment.upi_id if payment else '',
            'payment_details': payment.payment_details if payment else '',
        })


class PaymentProofViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PaymentProof.objects.all()
    serializer_class = PaymentProofSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADM':
            return PaymentProof.objects.all()
        return PaymentProof.objects.filter(payment__order__user=user)
