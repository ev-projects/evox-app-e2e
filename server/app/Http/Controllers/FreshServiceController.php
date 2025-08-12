<?php

namespace App\Http\Controllers;

use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\JsonResponse;
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
                ->returnResponseObject();
            $res = $req->get();
            if ($res->status == JsonResponse::HTTP_OK) {
                if (is_object(json_decode($res->content)) || is_array(json_decode($res->content))) {
                    $res = json_decode($res->content);
                } else {
                    $res = $res->content;
                }
            } else {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                return success_response(
                    trans('Could not load workspaces.'),
                    [],
                    JsonResponse::HTTP_OK
                );
            }
            return success_response(
                trans('Workspaces are successfully fetched!'),
                $res,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function getMyTickets(Request $request)
    {
        try {
            $me = Auth::user();
            $res = null;
            $workspaceId = is_valid($request->workspaceId) ? $request->workspaceId : null;
            $status = is_valid($request->status) ? $request->status : 'all';
            $req = Curl::to(env('FRESHSERVICE_API_BASE_URL') . '/tickets/my-tickets?status=' . $status . '&page=1&limit=25' . ($workspaceId ? '&workspaceId=' . $workspaceId : '') . '&userEmail=' . urlencode($me->email))
                ->withHeader('Accept: application/json')
                ->withTimeout(30)
                ->withConnectTimeout(30)
                ->returnResponseObject();
            $res = $req->get();
            if ($res->status == JsonResponse::HTTP_OK) {
                if (is_object(json_decode($res->content)) || is_array(json_decode($res->content))) {
                    $res = json_decode($res->content);
                } else {
                    $res = $res->content;
                }
            } else {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                return success_response(
                    trans('Could not load my tickets.'),
                    [],
                    JsonResponse::HTTP_OK
                );
            }
            return success_response(
                trans('My tickets are successfully fetched!'),
                $res,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('messages.error_default'), $e);
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
                'email' => $me->email
            ])->asJson();
            $res = $req->post();
            if ($res->status != JsonResponse::HTTP_OK) {
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                return success_response(
                    trans('Could not create ticket.'),
                    [],
                    JsonResponse::HTTP_OK
                );
            }
            return success_response(
                trans('Ticket was successfully created!'),
                [],
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
                ->returnResponseObject();
            $res = $req->get();
            if ($res->status == JsonResponse::HTTP_OK) {
                if (is_object(json_decode($res->content)) || is_array(json_decode($res->content))) {
                    $res = json_decode($res->content);
                } else {
                    $res = $res->content;
                }
            } else {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                return success_response(
                    trans('Could not load ticket details.'),
                    [],
                    JsonResponse::HTTP_OK
                );
            }
            return success_response(
                trans('Ticket details are successfully fetched!'),
                $res,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('messages.error_default'), $e);
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
                'body' => $request->body
            ])->asJson();
            $res = $req->post();
            if ($res->status != JsonResponse::HTTP_OK) {
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                return success_response(
                    trans('Could not create ticket.'),
                    [],
                    JsonResponse::HTTP_OK
                );
            }
            return success_response(
                trans('Ticket was successfully created!'),
                [],
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('messages.error_default'), $e);
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
                ->returnResponseObject();
            $res = $req->get();
            if ($res->status == JsonResponse::HTTP_OK) {
                if (is_object(json_decode($res->content)) || is_array(json_decode($res->content))) {
                    $res = json_decode($res->content);
                } else {
                    $res = $res->content;
                }
            } else {
                // throw new Exception('Curl Endpoint Invalid/Not Found', $result->status);
                log_to_file('info', 'ERROR', ['error' => $res], "fs");
                return success_response(
                    trans('Could not load ticket conversations.'),
                    [],
                    JsonResponse::HTTP_OK
                );
            }
            return success_response(
                trans('Ticket conversations are successfully fetched!'),
                $res,
                JsonResponse::HTTP_OK
            );
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('messages.error_default'), $e);
        }
    }

    public function saveTicketImage(Request $request)
    {
        try {
            if ($request->hasFile('file')) {
                $file = $request->file('file');
                $request->validate([
                    'file' => 'mimes:jpeg,png,jpg|max:5120', // 5MB max
                ]);

                $filename = time() . '-' . $file->getClientOriginalName();
                $path = $file->storeAs('public/uploads', $filename);

                return success_response(
                    trans('Image file uploaded successfully!'),
                    asset(str_replace('public/', 'storage/', $path)),
                    JsonResponse::HTTP_OK
                );
            }
            log_to_file('critical', 'API Call Failed!', 'No file uploaded', "fs");
            return error_response(trans('messages.error_default'), 'No file uploaded');
        } catch (Exception $e) {
            log_to_file('critical', 'API Call Failed!', $e->getMessage(), "fs");
            return error_response(trans('messages.error_default'), $e);
        }
    }
}
