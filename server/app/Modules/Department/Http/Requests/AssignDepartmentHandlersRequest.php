<?php

namespace App\Modules\Department\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignDepartmentHandlersRequest extends FormRequest
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
            'user_id.*'           => 'exists:users,id',
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
            'user_id.*.exists' => 'User/s does not exist',
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
