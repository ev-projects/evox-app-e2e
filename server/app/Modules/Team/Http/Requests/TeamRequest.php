<?php

namespace App\Modules\Team\Http\Requests;

use App\Modules\User\Models\User;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeamRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     *
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array
     */
    public function rules()
    {

        return [
            'name'                      => 'required|string',
            'department_id'             => 'required|exists:departments,id',
            'team_handlers'             => 'required|array',
            'team_handlers.*'           => 'required|exists:users,id',
            'team_users'                => 'required|array',
            'team_users.*'              => ['required',
                                                Rule::unique('team_users', 'user_id')->where(function ($query) {
                                                    return $query;
                                                })->ignore( $this->route('id') ?? 'null', 'team_id' ),

                                                Rule::exists('users', 'id')->where(function ($query) {
                                                    return $query->where('department_id', request()->get('department_id'));
                                                })->whereNull('deleted_at')
                                            ],
    ];
    }

    
    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array
     */
    public function messages()
    {
        $message =  [];

        // Construct specific message for existing and unique validation error for each user.
        foreach (request()->get('team_users') as $key => $value) {

            $user = User::find($value);
            
            $message["team_users.".$key.".exists"] = $user->getFullName() . " is not from this department selected.";
            $message["team_users.".$key.".unique"] = $user->getFullName() . " has already a team.";
        }

        return $message;
    }

    /**
     *  Manually throws the Validation error using our Templated Format
     */
    protected function failedValidation(Validator $validator) { 
        throw new HttpResponseException( 
            error_response( $validator->errors()->all(), [], JsonResponse::HTTP_UNPROCESSABLE_ENTITY) 
        ); 
    }
}
