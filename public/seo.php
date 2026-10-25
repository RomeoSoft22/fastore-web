<?php
/**
 * Entrega la tienda (index.html de Angular) con los metadatos de cada página ya escritos en el <head>:
 * título, descripción, Open Graph, Twitter y JSON-LD. Así WhatsApp, Facebook y Google leen el nombre,
 * precio e imagen del producto al compartir un enlace, sin ejecutar JavaScript.
 *
 * Producción: .htaccess envía aquí toda ruta que no sea un archivo. Local (para probar el SEO):
 *   php -S 127.0.0.1:4710 -t dist/fastore-web/browser dist/fastore-web/browser/seo.php
 */

// URL de fastore-api vista desde el servidor. Se puede cambiar con la variable FASTORE_API o seo-config.php.
$api = getenv('FASTORE_API') ?: 'https://shop.juarezcampos.net/fastore-api/api';
if (is_file(__DIR__.'/seo-config.php')) {
    $api = (include __DIR__.'/seo-config.php')['api'] ?? $api;
}

$ruta = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Servidor embebido de PHP: los archivos reales (js, css, imágenes) se sirven tal cual.
if (PHP_SAPI === 'cli-server') {
    if ($ruta !== '/' && is_file(__DIR__.$ruta)) {
        return false;
    }
    if (str_starts_with($ruta, '/fastore-api/') || $ruta === '/sitemap.xml') {
        $destino = $ruta === '/sitemap.xml' ? $api.'/seo/sitemap.xml' : preg_replace('#^/fastore-api/api#', $api, $ruta);
        $respuesta = @file_get_contents($destino.(empty($_SERVER['QUERY_STRING']) ? '' : '?'.$_SERVER['QUERY_STRING']));
        foreach ($http_response_header ?? [] as $cabecera) {
            if (preg_match('#^(content-type|cache-control):#i', $cabecera)) {
                header($cabecera);
            }
        }
        echo $respuesta;

        return true;
    }
}

$html = file_get_contents(__DIR__.'/index.html');
$meta = obtenerMeta($api, $ruta);

if ($meta) {
    http_response_code((int) ($meta['status'] ?? 200));
    $e = fn ($v) => htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    $etiquetas = [
        '<title>'.$e($meta['title']).'</title>',
        '<meta name="description" content="'.$e($meta['description']).'">',
        '<meta name="robots" content="'.$e($meta['robots'] ?? 'index, follow').'">',
        '<link rel="canonical" href="'.$e($meta['url']).'">',
        '<meta property="og:site_name" content="FAStore">',
        '<meta property="og:locale" content="es_PE">',
        '<meta property="og:type" content="'.$e($meta['type'] ?? 'website').'">',
        '<meta property="og:title" content="'.$e($meta['title']).'">',
        '<meta property="og:description" content="'.$e($meta['description']).'">',
        '<meta property="og:url" content="'.$e($meta['url']).'">',
        '<meta property="og:image" content="'.$e($meta['image']).'">',
        '<meta property="og:image:alt" content="'.$e($meta['image_alt'] ?? $meta['title']).'">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<meta name="twitter:title" content="'.$e($meta['title']).'">',
        '<meta name="twitter:description" content="'.$e($meta['description']).'">',
        '<meta name="twitter:image" content="'.$e($meta['image']).'">',
    ];
    if (! empty($meta['keywords'])) {
        $etiquetas[] = '<meta name="keywords" content="'.$e($meta['keywords']).'">';
        foreach ($meta['tags'] ?? [] as $tag) {
            $etiquetas[] = '<meta property="article:tag" content="'.$e($tag).'">';
        }
    }
    if (! empty($meta['image_width'])) {
        $etiquetas[] = '<meta property="og:image:width" content="'.(int) $meta['image_width'].'">';
        $etiquetas[] = '<meta property="og:image:height" content="'.(int) $meta['image_height'].'">';
    }
    if (! empty($meta['product'])) {
        $etiquetas[] = '<meta property="product:price:amount" content="'.$e($meta['product']['price']).'">';
        $etiquetas[] = '<meta property="product:price:currency" content="'.$e($meta['product']['currency']).'">';
        $etiquetas[] = '<meta property="product:availability" content="'.$e($meta['product']['availability']).'">';
        if (! empty($meta['product']['brand'])) {
            $etiquetas[] = '<meta property="product:brand" content="'.$e($meta['product']['brand']).'">';
        }
    }
    foreach ($meta['jsonld'] ?? [] as $dato) {
        $etiquetas[] = '<script type="application/ld+json" data-seo="jsonld">'
            .json_encode($dato, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP).'</script>';
    }

    $html = preg_replace('#<!-- seo:inicio.*?<!-- seo:fin -->#s', implode("\n  ", $etiquetas), $html, 1);
}

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-cache');
echo $html;

/** Pide los metadatos al API, con caché de 10 minutos en el disco para no consultar en cada visita. */
function obtenerMeta(string $api, string $ruta): ?array
{
    $cache = sys_get_temp_dir().'/fastore-seo-'.md5($api.$ruta).'.json';
    if (is_file($cache) && filemtime($cache) > time() - 600) {
        return json_decode((string) file_get_contents($cache), true) ?: null;
    }

    $contexto = stream_context_create(['http' => ['timeout' => 3, 'ignore_errors' => true, 'header' => "Accept: application/json\r\n"]]);
    $respuesta = @file_get_contents($api.'/seo/meta?ruta='.rawurlencode($ruta), false, $contexto);
    $meta = $respuesta ? json_decode($respuesta, true) : null;
    if (! is_array($meta) || empty($meta['title'])) {
        return null; // Sin API: se entrega index.html con los metadatos por defecto.
    }
    @file_put_contents($cache, json_encode($meta));

    return $meta;
}
