-- Apply AFTER migration_dynamic_cart_products.sql. Safe for existing customized products.
insert into public.she_cart_pages(name,slug) values ('Hidratante','hidratante'),('Stick','stick') on conflict(slug) do nothing;
update public.she_cart_products set image_url = '/cart/hidratante.webp' where yampi_token = 'EFH0YOIDTO' and (image_url is null or image_url = '');
update public.she_cart_products set image_url = '/cart/blister.webp' where yampi_token = '7B6B7IL4ZM' and (image_url is null or image_url = '');
update public.she_cart_products set image_url = '/cart/stick-clareador.webp' where yampi_token = 'GVVB8UXHJ8' and (image_url is null or image_url = '');
update public.she_cart_products set image_url = '/cart/hidratante.webp' where yampi_token = '6G99ZYJTDE' and (image_url is null or image_url = '');
update public.she_cart_products set image_url = '/cart/stick-clareador.webp' where yampi_token = 'IWK5ZWCEUO' and (image_url is null or image_url = '');
update public.she_cart_products set image_url = '/cart/pocket-size.webp' where yampi_token = 'ORM1LRMTT5' and (image_url is null or image_url = '');
