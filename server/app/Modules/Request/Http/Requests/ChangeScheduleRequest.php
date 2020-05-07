<?php

namespace App\Modules\Request\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use App\Modules\Schedule\Http\Requests\StoreScheduleRequest;

use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChangeScheduleRequest extends FormRequest
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
    public function rules(StoreScheduleRequest $request)
    {
        $id = ( is_valid( $this->route('id') ) ) ? $this->route('id') : 'null';

        // 'required|date_format:Y-m-d|unique:overtimes,date,'.($this->route('id') ?? 'null').',id,user_id,'.auth()->user()->id

        return [
            'valid_from'     => 'required | date_format:Y-m-d',
            'valid_to'       => 'required | date_format:Y-m-d',
            'employee_note'  => 'required | string|max:255',
            'approver_note'  => 'string | max:255'
        ];}
    
    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array
     */
    public function messages()
    {
        return [
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
