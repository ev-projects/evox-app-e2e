<?php

namespace App\Modules\Department\Http\Requests;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnnouncementRequest extends FormRequest
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
            'release_date' => 'required|date_format:Y-m-d',
            'expiry_date'=> 'required|date_format:Y-m-d',
            'title'  => 'required|string',
            // 'headline'  => 'string',
            // 'content'  => 'required',
            // 'on_link'=> 'boolean',
           
            
            'link' => 'required_if:on_link,true',
            'selectedDepartments' => 'required_if:set_all,0',
            'country_id' => 'required_if:set_country_all,0',


            // 'inputFileWasDeleted'=> 'boolean',
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
          

            'link.required_if' => 'A URL :attribute must be set when "Redirect as Link" is set.',
          
            'selectedDepartments.required_if' =>' :attribute must have atleast one department set.',
            'country_id.required_if' =>' :attribute must have selected a country or if set to Global Viewing.',
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
