<?php

use Illuminate\Http\JsonResponse;
use Ixudra\Curl\Facades\Curl;

if (! function_exists('bhr_api_call')) {  
    /**
     * This function conducts a cURL on Bamboo HR with specific API End Point.
     *
     * @param  string method
     * @param  string api_endpoint
     * @param  array data (Optional)
     * @return array;
     */
    function bhr_api_call($method = 'GET', $api_endpoint,  $data = array(), $send_as_json = false, $country = "default") {
        try{
            $result = null;

            log_to_file( 'info', 'Starting API call to this End Point: ' . $api_endpoint . ' ('.$method.')', [], "bhrlog");

            # Create the Response variable that handles the Curl Request

            $link = 'BHR_API_LINK';
            if($country != "default"){
                $link =  get_constant('BHR_COUNTRY_HOLIDAY_CALL.'. $country);
            }
            $response = Curl::to( env($link) . $api_endpoint )
                            ->withHeader('Accept: application/json')
                            ->withTimeout(300)
                            ->withConnectTimeout(300)
                            ->returnResponseObject();
            
            # If there's a Data that needs to be sent, adds the Data on the Curl request.
            if( count( $data ) > 0 ) {
                $response->withData( $data );

                if( $send_as_json ){
                    $response->asJson();
                }
                log_to_file( 'info', 'Has data parameter passed.', $data, "bhrlog");
            }

            // Executes the given Method.
            switch( $method ) {
                case 'GET':
                    $result = $response->get();
                    break;
                case 'POST':
                    $result = $response->post();
                    break;
                case 'PUT':
                    $result = $response->put();
                    break;
                case 'PATCH':
                    $result = $response->patch();
                    break;
                case 'DELETE':
                    $result = $response->delete();
                    break;
                default:
                    $result = $response->get();
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
                log_to_file( 'info', 'ERROR', ['error' => $result ], "bhrlog");
                return null;
            }
            
            log_to_file( 'info', 'API Call Success!', ['info' => $result ], "bhrlog");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], 'bhrlog');
            return $result;

        } catch(Exception $e) {
            
            log_to_file( 'critical', 'API Call Failed!', $e->getMessage(), "bhrlog");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], 'bhrlog');
            throw $e;
        }
    }
}

if (! function_exists('bhr_api_call_india')) {  
    /**
     * This function conducts a cURL on Bamboo HR with specific API End Point.
     *
     * @param  string method
     * @param  string api_endpoint
     * @param  array data (Optional)
     * @return array;
     */
    function bhr_api_call_india($method = 'GET', $api_endpoint,  $data = array(), $send_as_json = false) {
        try{
            $result = null;



            log_to_file( 'info', 'Starting API call to this End Point: ' . $api_endpoint . ' ('.$method.')', [], "bhrlog");
            
            # Create the Response variable that handles the Curl Request
            $response = Curl::to( env('BHR_API_LINK_INDIA') . $api_endpoint )
                            ->withHeader('Accept: application/json')
                            ->withTimeout(300)
                            ->withConnectTimeout(300)
                            ->returnResponseObject();
            
            # If there's a Data that needs to be sent, adds the Data on the Curl request.
            if( count( $data ) > 0 ) {
                $response->withData( $data );

                if( $send_as_json ){
                    $response->asJson();
                }
                log_to_file( 'info', 'Has data parameter passed.', $data, "bhrlog");
            }

            // Executes the given Method.
            switch( $method ) {
                case 'GET':
                    $result = $response->get();
                    break;
                case 'POST':
                    $result = $response->post();
                    break;
                case 'PUT':
                    $result = $response->put();
                    break;
                case 'PATCH':
                    $result = $response->patch();
                    break;
                case 'DELETE':
                    $result = $response->delete();
                    break;
                default:
                    $result = $response->get();
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
                log_to_file( 'info', 'ERROR', ['error' => $result ], "bhrlog");
                return null;
            }
            
            log_to_file( 'info', 'API Call Success!', ['info' => $result ], "bhrlog");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], 'bhrlog');
            return $result;

        } catch(Exception $e) {
            
            log_to_file( 'critical', 'API Call Failed!', $e->getMessage(), "bhrlog");
            // log_to_file( 'info', get_constant('LOG_GAP'), [], 'bhrlog');
            throw $e;
        }
    }
}