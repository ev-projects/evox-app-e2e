<?php

namespace App\Modules\Schedule\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;


/**
 *  This serves as the parent FormRequest for Schedule
 */

class ScheduleRequest extends FormRequest
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
        $rules = [
            'bind_to'                                   => 'string|in:user,department',
            'bind_id'                                   => 'string',
            'schedule_type'                             => 'required|string|in:standard,flexible,customize',
            'valid_from'                                => 'required_if:source_type,temporary|required_if:source_type,change_schedule|required_if:source_type,default|date_format:Y-m-d',
            'valid_to'                                  => 'required_if:source_type,temporary|required_if:source_type,change_schedule|date_format:Y-m-d',
            'work_days'                                 => 'array',            
            'schedule_policies.*'                       => 'bool|in:'.implode(',', array_merge(get_constant('SCHEDULE_POLICIES'), get_constant('SCHEDULE_HOLIDAY_POLICIES'))),
            'schedule_policies.allow_undertime'         => 'bool',
            'schedule_policies.allow_late'              => 'bool',
            'schedule_policies.allow_night_diff'        => 'bool',
            'schedule_policies.allow_special_holiday'   => 'bool',
            'schedule_policies.allow_legal_holiday'     => 'bool',
        ];

        // If Schedule Type is Customized, manually iterate the per Work Day rules
        if( isset( $request->schedule_type ) && $request->schedule_type == 'customize' && isset( $request->work_days ) ) {
            foreach( $request->work_days as $work_day) {
                $rules = array_merge($rules, create_work_day_rule($work_day));
            }

        // If Schedule Type is Standard/Flexible, set the rules for "All" Work Day 
        } elseif( isset( $request->schedule_type ) && in_array($request->schedule_type, array('standard', 'flexible')) ) {
            $rules = array_merge($rules, create_work_day_rule("all"));
        }
        
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
