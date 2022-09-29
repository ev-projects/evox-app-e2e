<!doctype html>
<html lang="{{ app()->getLocale() }}">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>Authenticating, please wait...</title>
    </head>
    <body>
        <script>
            var token = '{{$token}}';
            var front_end_url = '{{front_end_url}}';
        </script>
    </body>
</html>
