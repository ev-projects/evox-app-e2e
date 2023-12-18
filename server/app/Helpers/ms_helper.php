<?php

use Illuminate\Http\JsonResponse;
use Ixudra\Curl\Facades\Curl;

if (!function_exists('ms_get_access_token')) {  
    /**
     * This function conducts a cURL on Bamboo HR with specific API End Point.
     *
     * @param  string method
     * @param  string api_endpoint
     * @param  array data (Optional)
     * @return array;
     */
    function ms_get_access_token($tenant_id,  $data = array()) {
        try{
            $api_endpoint = "https://login.microsoftonline.com/{$tenant_id}/oauth2/v2.0/token";
            $result = null;
            log_to_file( 'info', 'Starting API call to this End Point: ' . $api_endpoint, [], "mslog");

            # Create the Response variable that handles the Curl Request
            $request = Curl::to( $api_endpoint )
                            ->withHeader('Content-Type: application/x-www-form-urlencoded')
                            ->withTimeout(300)
                            ->withConnectTimeout(300)
                            ->returnResponseObject();
            
            # If there's a Data that needs to be sent, adds the Data on the Curl request.
            if( count( $data ) > 0 ) {
                $request->withData( $data );
                log_to_file( 'info', 'Has data parameter passed.', $data, "mslog");
            }

            $result = $request->post();

            // If the Curl is a success, Decode the returned Content as a JSON
            if( $result->status == JsonResponse::HTTP_OK ) {
                if( is_object( json_decode($result->content) ) || is_array( json_decode($result->content) )   ) {
                    $result = json_decode($result->content);
                } else {
                    $result = $result->content;
                }

            // If not successful, manually throw exception.
            } else {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file( 'info', 'ERROR', ['error' => $result ], "mslog");
                return null;
            }
            
            log_to_file( 'info', 'API Call Success!', ['info' => $result ], "mslog");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], 'mslog');
            return $result;

        } catch(Exception $e) {
            
            log_to_file( 'critical', 'API Call Failed!', $e->getMessage(), "mslog");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], 'mslog');
            throw $e;
        }
    }
}

if (! function_exists('ms_call_api')) {  
    /**
     * This function conducts a cURL on Bamboo HR with specific API End Point.
     *
     * @param  string method
     * @param  string api_endpoint
     * @param  array data (Optional)
     * @return array;
     */
    function ms_call_api($access_token, $method = 'GET', $api_endpoint,  $data = array(), $send_as_json = false) {
        try{
            $result = null;

            log_to_file( 'info', 'Starting API call to this End Point: ' . $api_endpoint . ' ('.$method.')', [], "mslog");

            # Create the Response variable that handles the Curl Request

            $link = 'MSGRAPH_API';
            $request = Curl::to( env($link) . $api_endpoint )
                            ->withHeader('Authorization: Bearer ' . $access_token)
                            ->withTimeout(300)
                            ->withConnectTimeout(300)
                            ->returnResponseObject();
            
            # If there's a Data that needs to be sent, adds the Data on the Curl request.
            if( count( $data ) > 0 ) {
                $request->withData( $data );

                if( $send_as_json ){
                    $request->asJson();
                }
                log_to_file( 'info', 'Has data parameter passed.', $data, "mslog");
            }

            // Executes the given Method.
            switch( $method ) {
                case 'GET':
                    $result = $request->get();
                    break;
                case 'POST':
                    $result = $request->post();
                    break;
                case 'PUT':
                    $result = $request->put();
                    break;
                case 'PATCH':
                    $result = $request->patch();
                    break;
                case 'DELETE':
                    $result = $request->delete();
                    break;
                default:
                    $result = $request->get();
                    break;
            }

            // If the Curl is a success, Decode the returned Content as a JSON
            if( $result->status == JsonResponse::HTTP_OK ) {
                if( in_array( $method, array('POST', 'PUT') ) ){
                    $result = true;
                } else {
                    if( is_object( json_decode($result->content) ) || is_array( json_decode($result->content) )   ) {
                        $result = json_decode($result->content);
                    } else {
                        $result = $result->content;
                    }
                }

            // If not successful, manually throw exception.
            } else {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file( 'info', 'ERROR', ['error' => $result ], "mslog");
                return null;
            }
            
            log_to_file( 'info', 'API Call Success!', ['info' => $result ], "mslog");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], 'mslog');
            return $result;

        } catch(Exception $e) {
            
            log_to_file( 'critical', 'API Call Failed!', $e->getMessage(), "mslog");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], 'mslog');
            throw $e;
        }
    }
}