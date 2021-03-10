<?php

namespace App\Modules\User\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;


class RegisterUserRequest extends FormRequest
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
            'first_name'                => 'required|string',
            'last_name'                 => 'required|string',
            'email'                     => 'required|string|unique:users,email',
            'departments_handled'       => 'required|array',
            'departments_handled.*'     => 'required|string|exists:departments,id',
            'roles'                     => 'required|array',
            'roles.*'                   => 'required|exists:roles,name',
            // 'permissions'               => 'required|array',
            // 'permissions.*'             => 'required|exists:permissions,name',
        ];
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array
     */
    public function messages()
    {
        return [
            'email.exists' => 'The email address does not exist.'
        ];
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
