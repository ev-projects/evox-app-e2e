<?php

namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Ixudra\Curl\Facades\Curl;

class FreshServiceController extends Controller
{
    public function getWorkspaces()
    {
        try {
            $res = null;
            $req = Curl::to(env('FRESHSERVICE_API_BASE_URL') . '/workspaces')
                ->withHeader('Accept: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject()
                ->asJson();
            $res = $req->get();
            if ($res->status != JsonResponse::HTTP_OK) {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                $error = "Could not load workspaces, please try again.";
                if (isset($res->content->message))
                    $error = $res->content->message;
                if (isset($res->content->title))
                    $error = $res->content->title;
                return error_response(
                    $error,
                    $res,
                );
            }
            return success_response(
                trans('Workspaces are successfully fetched!'),
                $res->content,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('Could not load workspaces, please try again.'), $e);
        }
    }

    public function getMyTickets(Request $request)
    {
        try {
            $me = Auth::user();
            $res = null;
            $workspaceId = is_valid($request->workspaceId) ? $request->workspaceId : null;
            $status = is_valid($request->status) ? $request->status : 'all';
            $req = Curl::to(env('FRESHSERVICE_API_BASE_URL') . '/tickets/my-tickets?status=' . $status . '&page='.$request->page.'&limit='.$request->limit . ($workspaceId ? '&workspaceId=' . $workspaceId : '') . '&userEmail=' . urlencode($me->email))
                ->withHeader('Accept: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject()
                ->asJson();
            $res = $req->get();
            if ($res->status != JsonResponse::HTTP_OK) {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                $error = "Could not load tickets, please try again.";
                if (isset($res->content->message))
                    $error = $res->content->message;
                if (isset($res->content->title))
                    $error = $res->content->title;
                return error_response(
                    $error,
                    $res,
                );
            }
            return success_response(
                trans('My tickets are successfully fetched!'),
                $res->content,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('Could not load tickets, please try again.'), $e);
        }
    }

    public function createTicket(Request $request)
    {
        try {
            $me = Auth::user();
            $res = null;
            $req = Curl::to(env('FRESHSERVICE_API_BASE_URL') . '/tickets?userEmail=' . urlencode($me->email))
                ->withHeader('Accept: application/json')
                //->withHeader('Content-Type: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject();
            $req->withData([
                'description' => $request->description,
                'priority' => intval($request->priority),
                'status' => intval($request->status),
                'subject' => $request->subject,
                'workspace_id' => intval($request->workspace_id),
                'email' => $me->email,
                'attachments' => $request->attachments
            ])->asJson();
            $res = $req->post();
            if ($res->status != JsonResponse::HTTP_OK) {
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                $error = "Could not create ticket, please try again.";
                if (isset($res->content->message))
                    $error = $res->content->message;
                if (isset($res->content->title))
                    $error = $res->content->title;
                return error_response(
                    $error,
                    $res,
                );
            }
            $ticket = $res->content->ticket;
            call_sp("EV_SP_FS_Ticket_Count", [
                $ticket->id,
                $ticket->requester_id,
                $ticket->created_at,
                $ticket->workspace_id,
                $me->id
            ]);
            return success_response(
                trans('Ticket was successfully created!'),
                $res->content->ticket,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function getTicket($id)
    {
        try {
            $me = Auth::user();
            $res = null;
            $req = Curl::to(env('FRESHSERVICE_API_BASE_URL') . '/tickets/' . $id . '?userEmail=' . urlencode($me->email))
                ->withHeader('Accept: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject()
                ->asJson();
            $res = $req->get();
            if ($res->status != JsonResponse::HTTP_OK) {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                $error = "Could not load ticket detais, please try again.";
                if (isset($res->content->message))
                    $error = $res->content->message;
                if (isset($res->content->title))
                    $error = $res->content->title;
                return error_response(
                    $error,
                    $res,
                );
            }
            return success_response(
                trans('Ticket details are successfully fetched!'),
                $res->content,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('Could not load ticket details, please try again.'), $e);
        }
    }

    public function sendTicketConversation(Request $request)
    {
        try {
            $me = Auth::user();
            $res = null;
            $req = Curl::to(env('FRESHSERVICE_API_BASE_URL') . '/tickets/' . $request->id . '/reply?userEmail=' . urlencode($me->email))
                ->withHeader('Accept: application/json')
                //->withHeader('Content-Type: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject();
            $req->withData([
                'body' => $request->body,
                'user_id' => $request->requester_id,
                'attachments' => $request->attachments
            ])->asJson();
            $res = $req->post();
            if ($res->status != JsonResponse::HTTP_OK) {
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                $error = "Could not create ticket reply, please try again.";
                if (isset($res->content->message))
                    $error = $res->content->message;
                if (isset($res->content->title))
                    $error = $res->content->title;
                return error_response(
                    $error,
                    $res,
                );
            }
            return success_response(
                trans('Ticket reply was successfully created!'),
                $res->content,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('Could not create ticket reply, please try again.'), $e);
        }
    }

    public function getTicketConversation($id)
    {
        try {
            $me = Auth::user();
            $res = null;
            $req = Curl::to(env('FRESHSERVICE_API_BASE_URL') . '/tickets/' . $id . '/conversations?userEmail=' . urlencode($me->email))
                ->withHeader('Accept: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject()
                ->asJson();
            $res = $req->get();
            if ($res->status != JsonResponse::HTTP_OK) {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                $error = "Could not load ticket conversations, please try again.";
                if (isset($res->content->message))
                    $error = $res->content->message;
                if (isset($res->content->title))
                    $error = $res->content->title;
                return error_response(
                    $error,
                    $res,
                );
            }
            return success_response(
                trans('Ticket conversations are successfully fetched!'),
                $res->content,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('Could not load ticket conversations, please try again.'), $e);
        }
    }

    public function saveTicketImage(Request $request)
    {
        try {
            if ($request->hasFile('file')) {
                $request->validate([
                    'file' => 'mimes:jpeg,png,jpg|max:5120', // 5MB max
                ]);
                $file = $request->file('file');

                $filename = time() . '-' . $file->getClientOriginalName();
                $path = $file->storeAs('public/uploads', $filename);
                $file_url = env('ASSET_URL') . Storage::url($path);
                return success_response(
                    trans('Image file uploaded successfully!'),
                    str_replace('public/', 'storage/', $file_url),
                    JsonResponse::HTTP_OK
                );
            }
            log_to_file('critical', 'API Call Failed!', 'No file uploaded', "fs");
            return error_response(trans('An error occurred while uploading atatchment, please try again.'), []);
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response('Could not upload your attachment, please make sure it is not more than 5MB in size. The file must be a type of: jpeg, jpg, png, gif, bmp, webp, pdf, doc, docx, xls, xlsx, txt, or csv.', $e);
        }
    }

    public function saveAttachment(Request $request)
    {
        try {
            if ($request->hasFile('attachment')) {
                $request->validate([
                    'attachment' => 'mimes:jpeg,jpg,png,gif,bmp,webp,pdf,doc,docx,xls,xlsx,txt,csv|max:5120',
                    'workspace_id' => 'required|integer',
                ], [
                    'file.mimes' => 'The file must be a type of: jpeg, jpg, png, gif, bmp, webp, pdf, doc, docx, xls, xlsx, txt, or csv.',
                    'file.max' => 'The file size must not exceed 5MB.',
                ]);
                $file = $request->file('attachment');
                $originalName = $file->getClientOriginalName();
                $extension = $file->getClientOriginalExtension();
                $randomName = uniqid('upload_', true) . '.' . $extension;
                $path = $file->storeAs('temp', $randomName);
                $fullPath = storage_path('app/' . $path);
                $mimeType = (new \finfo(FILEINFO_MIME_TYPE))->file($fullPath)
                ?? File::mimeType($fullPath)
                ?? $file->getClientMimeType();
                if (($mimeType == 'application/octet-stream') and ($extension == 'pdf')) {
                    $mimeType = 'application/pdf';
                }
                $contents = file_get_contents($fullPath);
                $base64Data = base64_encode($contents);
                $fileInfo = [
                    'fileName' => $originalName,
                    'contentType' => $mimeType,
                    'contentBase64' => $base64Data,
                    'exists' => file_exists($fullPath)
                ];
                Storage::delete($path);
                $req = Curl::to(env('FRESHSERVICE_API_BASE_URL') . '/tickets/' . $request->workspace_id . '/attachments')
                ->withHeader('Accept: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject();
                $req->withData([$fileInfo])->asJson();
                $res = $req->post();
                if ($res->status != JsonResponse::HTTP_OK) {
                    // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                    log_to_file('info', 'ERROR', ['error' => $res], "fs");
                    $error = "Could not upload your attachment, please make sure it is not more than 5MB in size. The file must be a type of: jpeg, jpg, png, gif, bmp, webp, pdf, doc, docx, xls, xlsx, txt, or csv.";
                    if (isset($res->content->message))
                        $error = $res->content->message;
                    if (isset($res->content->title))
                        $error = $res->content->title;
                    return error_response(
                        $error,
                        $res,
                    );
                }
                return success_response(
                    trans('Attachment uploaded successfully!'),
                    $res->content,
                    JsonResponse::HTTP_OK
                );
            }
            log_to_file('critical', 'API Call Failed!', 'No file uploaded', "fs");
            return error_response(trans('messages.error_default'), 'No file uploaded');
        } catch (ValidationException  $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            $error = "Could not upload your attachment, please make sure it is not more than 5MB in size. The file must be a type of: jpeg, jpg, png, gif, bmp, webp, pdf, doc, docx, xls, xlsx, txt, or csv.";
            return error_response($error, []);
        } catch (\Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response($e->getMessage(), []);
        }
    }
}
