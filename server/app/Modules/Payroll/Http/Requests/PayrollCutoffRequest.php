<?php

namespace App\Modules\Payroll\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class PayrollCutoffRequest extends FormRequest
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
    public function rules(Request $request)
    {   
        $start_date = $request->get('start_date');
        $end_date = $request->get('end_date');

        $rules =  [
            'name'                      => 'string|max:255',
            'start_date'                => 'required|date|date_format:"Y-m-d"|unique_payroll_cutoff:payroll_cutoffs',
            'end_date'                  => 'required|date|date_format:"Y-m-d"|after_or_equal:start_date',
        ];

        return $rules;
    }

    /**
     * Get the error messages for the defined validation rules.
     *
     * @return array
     */
    public function messages()
    {
        return [
            'start_date.unique_payroll_cutoff' => 'The date range/one of the date range that are submitted already exists or within the scope of other cutoffs.'
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
