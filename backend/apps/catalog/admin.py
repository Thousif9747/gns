from django.contrib import admin
from .models import Category, Product, ProductImage, ProductReview, AdBanner, Announcement, Offer


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'parent', 'is_active', 'display_order']
    prepopulated_fields = {'slug': ('name',)}

class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1
    fields = ['image', 'sort_order', 'is_homepage_banner']
    readonly_fields = []


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['id','name', 'slug', 'category', 'base_price', 'stock', 'is_available', 'is_featured']
    prepopulated_fields = {'slug': ('name',)}
    inlines = [ProductImageInline]



@admin.register(Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ['name', 'discount_type', 'discount_value', 'start_date', 'end_date', 'is_homepage_banner', 'is_active']


@admin.register(ProductReview)
class ProductReviewAdmin(admin.ModelAdmin):
    list_display = ['product', 'user', 'rating', 'is_approved', 'created_at']
    list_filter = ['rating', 'is_approved', 'created_at']
    search_fields = ['product__name', 'user__email', 'content']
    list_editable = ['is_approved']


@admin.register(AdBanner)
class AdBannerAdmin(admin.ModelAdmin):
    list_display = ['title', 'display_order', 'is_active', 'created_at']
    list_editable = ['display_order', 'is_active']


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ['text', 'display_order', 'is_active', 'updated_at']
    list_editable = ['display_order', 'is_active']
    search_fields = ['text']
