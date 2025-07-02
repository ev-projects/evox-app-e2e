<?php
namespace App\Http\Controllers;

use Exception;
use GuzzleHttp\Psr7\Response;
use Illuminate\Http\Request;
use Ixudra\Curl\Facades\Curl;

class NeoController extends Controller
{
    public function get_neo_onboarding_users()
    {
        $default_content = [];
        try {
            $api_endpoint = '/api/user/';
            $response = Curl::to( env('NEO_SERVER_HOST') . $api_endpoint )
                ->withHeader('Accept: application/json')
                ->withTimeout(300)
                ->withConnectTimeout(300)
                ->returnResponseObject()
                ->get();

            if ($response->status == 200) {
                return $response->content;
            }
            return response()->json($default_content);
        } catch (Exception $e) {
            return response()->json($default_content);
        }
    }

    public function send_onboarding_link($guid)
    {
        try {
            $api_endpoint = '/api/user/send/mail/' . $guid;
            $response = Curl::to( env('NEO_SERVER_HOST') . $api_endpoint )
                ->withHeader('Accept: application/json')
                ->withTimeout(300)
                ->withConnectTimeout(300)
                ->returnResponseObject()
                ->get();

            if ($response->status == 200) {
                return $response->content;
            }
            return false;
        } catch (Exception $e) {
            return false;
        }
    }
}