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

        return [
            'valid_from'    =>  'required|date|date_format:"Y-m-d"|unique_dates:change_schedules',
            'valid_to'      =>  'required|date|after_or_equal:valid_from|date_format:"Y-m-d"',
            'employee_note'  => 'required|string|max:255',
            'approver_note'  => 'string|max:255'
        ]
        ;}
    
    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array
     */
    public function messages()
    {
        return [
            'valid_from.unique_dates' => 'The dates that are submitted is already exist'
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
