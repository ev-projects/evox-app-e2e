<?php

namespace App\Modules\Request\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AlterLogRequest extends FormRequest
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
        $id = ( is_valid( $this->route('id') ) ) ? $this->route('id') : 'null';

        // 'required|date_format:Y-m-d|unique:overtimes,date,'.($this->route('id') ?? 'null').',id,user_id,'.auth()->user()->id

        return [
            'date'                               => ['required', 'date_format:Y-m-d',  
                                                     Rule::unique('alter_logs', 'date')->where(function ($query) {
                                                            return $query->where('user_id', auth()->user()->id);
                                                     })->ignore( $this->route('id') ?? 'null' )
                                                       ->whereNull('deleted_at')
                                                    ],
            'current_time_in'                               => 'required|date_format:Y-m-d H:i:s',
            'current_time_out'                             => 'required|date_format:Y-m-d H:i:s',
            'new_time_in'                               => 'required|date_format:Y-m-d H:i:s',
            'new_time_out'                             => 'required|date_format:Y-m-d H:i:s',
            'employee_note'                      => 'required|string|max:255',
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
