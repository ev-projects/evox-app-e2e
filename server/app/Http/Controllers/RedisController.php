<?php
namespace App\Http\Controllers;

use Exception;
use GuzzleHttp\Psr7\Response;
use Illuminate\Http\Request;
use Ixudra\Curl\Facades\Curl;

class RedisController extends Controller
{
    public function get_redis_notifications($user_id)
    {
        $default_content = [
            'requestsForApproval' => [],
            'requestStatus' => [],
            'announcements' => [],
            'celebrations' => [],
            'missedDtr' => []
        ];
        try {
            $api_endpoint = '/api/cache/' . $user_id;
            $response = Curl::to( env('REDIS_SERVER_HOST') . $api_endpoint )
                                ->withHeader('Accept: application/json')
                                ->withTimeout(300)
                                ->withConnectTimeout(300)
                                ->returnResponseObject()
                                ->get();
            if ($response->status == 200) {
                if ((!isset($response->content)) or (empty($response->content))) {
                    return response()->json($default_content);
                }
                return response()->json($response->content);
            } else if ($response->status == 404) {
                return response()->json($default_content);
            } else {
                return response()->json($default_content);
            }
        } catch (Exception $e) {
            return response()->json($default_content);
        }
    }
}