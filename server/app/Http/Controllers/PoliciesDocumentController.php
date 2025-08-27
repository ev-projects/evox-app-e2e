<?php

namespace App\Http\Controllers;
use Auth;
use App\EV_Policies_Document;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Http\JsonResponse;

class PoliciesDocumentController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index()
    {
        //
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        //
    }


    public function upload(Request $request)
    {

        try {


        // Base64 decode the uploaded file
        $fileData = $request->file('FileData');

        foreach($fileData as $d) {

            // Get the File Name of the uploaded file

                $fileName = $d->getClientOriginalName();

            // Get the MIME type of the uploaded file

                $mimeType = $d->getMimeType();

            // Get the Extension type of the uploaded file
                $extension = $d->getClientOriginalExtension();

            if ($mimeType !== 'text/csv') {

                if ($extension === 'csv') {
                $mimeType = 'text/csv';  // Manually set MIME type for CSV
                }
            }

            // Read the image file content

                $imageContent = file_get_contents($d->getRealPath());

            // Encode the image content to base64

                $base64 = base64_encode($imageContent);

            // Combine the MIME type with base64 encoded data

                $base64String = 'data:' . $mimeType . ';base64,' . $base64;


            // $fileBase64 = base64_encode(file_get_contents($d));

                $fileBase64 = $base64String;


        try {
            $me = Auth::user();
            $result = call_sp('EV_SP_Policies_Document', [$fileBase64, $request->GlobalType, $request->CountryId, $me->id,$fileName, $extension, $mimeType, null, $request->selectedDepartments, null, 1, $request->title, null]);
            log_to_file('info', 'UploadDocument', [$result], 'document_upload');

        } catch (Exception $e) {
            log_to_file('error', 'UploadDocument', [$e], 'document_upload');
            return error_response( trans('messages.error_default'), $e );
        }

        }

        return response()->json(['message' => 'File uploaded successfully!'], 200);

        } catch(Exception $e){
            log_to_file('error', 'UploadDocument', [$e], 'document_upload');
            return error_response( trans('messages.error_default'), $e );

        }
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show(Request $request)
    {
        try {
            $me = Auth::user();
            $result = call_sp('EV_SP_Policies_Document', [null, $request->GlobalType, $me->country_id, null,null, null, null, null, $request->selectedDepartments, null, 3, null, null]);

            $policies = [];
            if ($result[0]) {
                foreach ($result[0] as $key => $value) {
                    $policies[$value->Name][] = $value;
                }
            }

            return success_response(
                trans('messages.fetch_policies_success'), 
                $policies,
                JsonResponse::HTTP_OK,
            );
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function showlist(Request $request)
    {
        try {
            $me = Auth::user();
            $result = call_sp('EV_SP_Policies_Document', [null, $request->GlobalType, $me->country_id, null,null, null, null, null, $request->selectedDepartments, $me->id, 5, null, null]);
            $response['content'] = $result[0];
            return $response;
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function updatestatus($id, $staus)
    {
        try {
            $me = Auth::user();
            $result = call_sp('EV_SP_Document_Status_Update', [$id, $staus, $me->id]);
            $response['content'] = $result[0];
            return $response;
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

    public function downloadPolicy(Request $request, $id)
    {
        try {
            $me = Auth::user();
            $result = call_sp('EV_SP_Policies_Document', [null, null, $me->country_id, null,null, null, null, null, null, $me->id, 6, null, $id]);
            return $result[0];
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }



    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function edit($id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request, $id)
    {
        //
    }


    public function get_user_departments(Request $request)
    {

        $me = Auth::user();
        $userId = $me->id;

        try {
            $result = call_sp('EV_SP_Policies_Document', [null, $request->GlobalType, $request->CountryId, null,null, null, null, null, null,$userId, 4, null, null]);
            return $result[0];
        } catch (Exception $e) {
            return error_response( trans('messages.error_default'), $e );
        }
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }
}