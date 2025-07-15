<?php
namespace App\Http\Controllers;

use Exception;
use GuzzleHttp\Psr7\Response;
use Illuminate\Http\Request;
use Ixudra\Curl\Facades\Curl;

class NeoController extends Controller
{
    const COUNTRIES = [1 => "India", 2 => "Philippines", 3 => "Morocco", 4 => "Bulgaria", 5 => "Belgium"];
    const COUNTRY_API_KEYS = [
        "Philippines" => 'NEO_API_KEY_PH',
        "India"       => 'NEO_API_KEY_IN',
        "Morocco"     => 'NEO_API_KEY_MA',
        "Bulgaria"    => 'NEO_API_KEY_BG',
        "Belgium"     => 'NEO_API_KEY_BE',
    ];

    public function get_api_headers($country) {
        $headers = [];
        if ($country) {
            $api_key = env(self::COUNTRY_API_KEYS[$country]);
            $headers = [
                'Accept: application/json',
                'x-api-key: ' . $api_key,
            ];
        }
        return $headers;
    }

    public function get_neo_onboarding_users(Request $request)
    {
        $default_content = [];
        try {
            // get country id based from the country payload
            $country_id = array_search($request->country, self::COUNTRIES);
            $api_endpoint = '/api/hr/available-users?countryId=' . $country_id;

            $response = Curl::to( env('NEO_SERVER_HOST') . $api_endpoint )
                ->withHeaders($this->get_api_headers($request->country))
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject()
                ->get();

            if ($response->status === 200) {
                return $response->content;
            }
            return response()->json($default_content);
        } catch (Exception $e) {
            return response()->json($e);
        }
    }

    public function get_users_pending_submissions(Request $request)
    {
        $default_content = [];
        try {
            // get country id based from the country payload
            $country_id = array_search($request->country, self::COUNTRIES);
            $api_endpoint = '/api/hr/pending-submissions?countryId=' . $country_id;

            $response = Curl::to( env('NEO_SERVER_HOST') . $api_endpoint )
                ->withHeaders($this->get_api_headers($request->country))
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject()
                ->get();

            if ($response->status === 200) {
                return $response->content;
            }
            return response()->json($default_content);
        } catch (Exception $e) {
            return response()->json($e);
        }
    }

    public function get_user_submissions_data(Request $request)
    {
        $default_content = [];
        try {
            $api_endpoint = '/api/genericform/review/' . $request->guid;
            $response = Curl::to( env('NEO_SERVER_HOST') . $api_endpoint )
                ->withHeader('Accept: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject()
                ->get();

            if ($response->status === 200) {
                return $response->content;
            }
            return response()->json($default_content);
        } catch (Exception $e) {
            return response()->json($default_content);
        }
    }

    public function send_onboarding_link(Request $request)
    {
        try {
            $api_endpoint = '/api/hr/initiate-neo/' . $request->guid . '/' . $request->user_id;
            $response = Curl::to( env('NEO_SERVER_HOST') . $api_endpoint )
                ->withHeaders($this->get_api_headers($request->country))
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject()
                ->post();

            if ($response->status === 200) {
                return $response->content;
            } else {
                return error_response(trans('Error while getting data'), $response->content);
            }
        } catch (Exception $e) {
            return $e;
        }
    }

    public function approve_submissions(Request $request)
    {
        try {
            $api_endpoint = '/api/genericform/approve/' . $request->guid;
            $response = Curl::to( env('NEO_SERVER_HOST') . $api_endpoint )
                ->withHeaders($this->get_api_headers($request->country))
                ->withHeader('Content-Type: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->withData(json_encode([
                    'approvedBy' => $request->approvedBy,
                    'department' => $request->department,
                    'notes' => $request->notes
                ]))
                ->returnResponseObject()
                ->post();

            if ($response->status === 200) {
                return $response->content;
            }
            return false;
        } catch (Exception $e) {
            return false;
        }
    }

    public function request_for_resubmission(Request $request)
    {
        try {
            $api_endpoint = '/api/genericform/resubmit/';
            $response = Curl::to( env('NEO_SERVER_HOST') . $api_endpoint )
                ->withHeaders($this->get_api_headers($request->country))
                ->withHeader('Content-Type: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(300)
                ->withData(json_encode([
                    'userGuid' => $request->userGuid,
                    'fieldsToResubmit' => json_decode($request->fieldsToResubmit, true),
                    'reason' => $request->reason,
                    'requestedBy' => $request->requestedBy
                ]))
                ->returnResponseObject()
                ->post();

            if ($response->status === 200) {
                return $response->content;
            }
            return false;
        } catch (Exception $e) {
            return false;
        }
    }

    public function get_file($userId, $fileId) {
        try {
            //$guid = '7655cf0e-2103-4456-8396-f67b1444a425';
            $mimeType = 'image/png';//remove this later
            $api_endpoint = '/api/genericform/file/' . $fileId ."?userId=". $userId;
            $response = Curl::to( env('NEO_SERVER_HOST') . $api_endpoint )
                ->withHeader('Accept: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject()
                ->get();
            if ($response->status == 200) {
                $responseContent = $response->content;
                $fileData = json_decode($responseContent, true);
                return success_response(
                    trans('Sucess'), 
                    $fileData
                );
            }
            return response('File not found', 404);
        } catch (Exception $e) {
            log_to_file( 'info', "NEO File", [$e->getMessage()]);
            return response('File not found', 404);
        }
    }
}