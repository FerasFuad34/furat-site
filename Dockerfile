# الفرات الحلوة — نسخة PHP للمعاينة على Render (نفس الكود، وضع ملفات بدون قاعدة)
FROM php:8.4-cli-bookworm
RUN apt-get update \
 && apt-get install -y --no-install-recommends libpng-dev libjpeg-dev libfreetype6-dev pkg-config \
 && docker-php-ext-install gd mysqli \
 && apt-get clean && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY . /app
ENV PORT=10000
CMD php -S 0.0.0.0:${PORT} -t public_html public_html/index.php
