<?php

namespace App\Modules\User\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UpdateUserProfileRequest extends FormRequest
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
            'email'                     => ['required', 'string',  
                                                Rule::unique('users', 'email')->where(function ($query) {
                                                    return $query;
                                                })->ignore( $this->route('id') ?? 'null' )
                                                ->whereNull('deleted_at')
                                            ],
            'mobile_number'             => ['required', 'string',  
                                                Rule::unique('users', 'mobile_number')->where(function ($query) {
                                                    return $query;
                                                })->ignore( $this->route('id') ?? 'null' )
                                                ->whereNull('deleted_at')
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
        return [];
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
