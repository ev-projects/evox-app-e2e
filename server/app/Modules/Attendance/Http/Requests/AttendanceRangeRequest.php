<?php

namespace App\Modules\Attendance\Http\Requests;

use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;

/**
 *  Shared validation for the three attendance read endpoints. Validates the
 *  optional from/to/per_page/page query params; route-segment IDs are
 *  validated by the route's `where('…', '[0-9]+')` regex and the controller
 *  existence check.
 */
abstract class AttendanceRangeRequest extends FormRequest
{
    /**
     * @return bool
     */
    public function authorize()
    {
        return true;
    }

    /**
     * @return array
     */
    public function rules()
    {
        return [
            'from'     => 'nullable|date_format:Y-m-d',
            'to'       => 'nullable|date_format:Y-m-d|after_or_equal:from',
            'per_page' => 'nullable|integer|min:1|max:200',
            'page'     => 'nullable|integer|min:1',
        ];
    }

    /**
     * @return array
     */
    public function messages()
    {
        return [
            'from.date_format'      => 'The from date must follow YYYY-MM-DD.',
            'to.date_format'        => 'The to date must follow YYYY-MM-DD.',
            'to.after_or_equal'     => 'The to date must be the same as or later than the from date.',
            'per_page.max'          => 'The per_page parameter cannot exceed 200.',
        ];
    }

    /**
     *  Cap the date range at 90 days to protect the DB. Adds a top-level
     *  validator hook that runs after the rule-based validation passes.
     */
    public function withValidator($validator)
    {
        $validator->after(function ($v) {
            $from = $this->query('from');
            $to   = $this->query('to');
            if ($from && $to) {
                $diff = strtotime($to) - strtotime($from);
                if ($diff > (90 * 86400)) {
                    $v->errors()->add('to', 'The date range cannot exceed 90 days.');
                }
            }
        });
    }

    /**
     *  Use the project's standard error envelope.
     */
    protected function failedValidation(Validator $validator)
    {
        throw new HttpResponseException(
            error_response(
                $validator->errors()->all(),
                [],
                JsonResponse::HTTP_UNPROCESSABLE_ENTITY
            )
        );
    }
}
