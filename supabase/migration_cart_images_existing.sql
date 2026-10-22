-- Execute after migration_dynamic_cart_products.sql. Safe to re-run.
-- Initial images are served from public/cart; originals remain in src/assets/cart.
-- Future admin uploads are stored in Supabase Storage (Vercel filesystem is read-only).
UPDATE public.she_cart_products SET image_url = '/cart/hidratante.webp' WHERE yampi_token = 'EFH0YOIDTO' AND (image_url IS NULL OR image_url = '');
UPDATE public.she_cart_products SET image_url = '/cart/blister.webp' WHERE yampi_token = '7B6B7IL4ZM' AND (image_url IS NULL OR image_url = '');
UPDATE public.she_cart_products SET image_url = '/cart/stick-clareador.webp' WHERE yampi_token = 'GVVB8UXHJ8' AND (image_url IS NULL OR image_url = '');
UPDATE public.she_cart_products SET image_url = '/cart/hidratante.webp' WHERE yampi_token = '6G99ZYJTDE' AND (image_url IS NULL OR image_url = '');
UPDATE public.she_cart_products SET image_url = '/cart/stick-clareador.webp' WHERE yampi_token = 'IWK5ZWCEUO' AND (image_url IS NULL OR image_url = '');
UPDATE public.she_cart_products SET image_url = '/cart/pocket-size.webp' WHERE yampi_token = 'ORM1LRMTT5' AND (image_url IS NULL OR image_url = '');
-- Register the two existing pages without changing saved custom cart configurations.
INSERT INTO public.she_cart_pages (name, slug) VALUES ('Hidratante','hidratante'), ('Stick','stick') ON CONFLICT (slug) DO NOTHING;
