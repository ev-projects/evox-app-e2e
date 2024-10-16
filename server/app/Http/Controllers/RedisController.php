<?php
namespace App\Http\Controllers;
use Illuminate\Http\Request;
use Ixudra\Curl\Facades\Curl;

class RedisController extends Controller
{
    public function get_redis_notifications($user_id)
    {
        $api_endpoint = '/api/cache/' . $user_id;
        $response = Curl::to( env('REDIS_SERVER_HOST') . $api_endpoint )
                            ->withHeader('Accept: application/json')
                            ->withTimeout(300)
                            ->withConnectTimeout(300)
                            ->returnResponseObject()
                            ->get();

        return $response->content;
    }
}