<?php

namespace App\Modules\Request\Http\Requests;

use App\Rules\ValidBreakTime;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RestDayWorkRequest extends FormRequest
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
        $id = ( is_valid( $this->route('id') ) ) ? $this->route('id') : 'null';

        return [
            'date'                               => ['required', 'date_format:Y-m-d',  
                                                     Rule::unique('rest_day_works', 'date')->where(function ($query) {
                                                            return $query->where('user_id', auth()->user()->id);
                                                     })->ignore( $this->route('id') ?? 'null' )
                                                       ->whereNull('deleted_at')
                                                    ],
            'start_time'                         => 'required|date_format:H:i',
            'end_time'                           => 'required|date_format:H:i',
            'break_time'                         => ['required', 'date_format:H:i', new ValidBreakTime],
            'employee_note'                      => 'string|max:255',
            'approver_note'                      => 'string|max:255'
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
