<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Validator;

use Illuminate\Support\Facades\DB;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        Validator::extend('unique_dates', function ($attribute, $value, $parameters, $validator) {
            $inputs = $validator->getData();      
            $query_count = DB::table($parameters[0])->where('user_id', '=',  $inputs['bind_id'])                            
                            ->where(function ($query) use ($inputs) {
                                $query
                                # If there record between "from" date
                                ->where(function ($query) use ($inputs) {
                                    $query->whereDate('valid_from', '<' ,$inputs['valid_from'])
                                    ->whereDate('valid_to', '>' ,$inputs['valid_from']);
                                })
                                # If there record between "to" date
                                ->orwhere(function ($query) use ($inputs) {
                                    $query->whereDate('valid_from', '<' ,$inputs['valid_to'])
                                    ->whereDate('valid_to', '>' ,$inputs['valid_to']);
                                })
                                # If there record within submitted dates
                                ->orwhere(function ($query) use ($inputs) {
                                    $query->whereDate('valid_from', '<' ,$inputs['valid_from'])
                                    ->whereDate('valid_to', '>' ,$inputs['valid_to']);
                                })
                                # If there is dates between submitted dates
                                ->orwhere(function ($query) use ($inputs) {
                                    $query->whereDate('valid_from', '>' ,$inputs['valid_from'])
                                    ->whereDate('valid_to', '<' ,$inputs['valid_to']);
                                });
                            })
                        ->get()->count();
            if($query_count>0){
                return false;
            }
          
            return true;
        });

        // Validation for Unique Payroll Cutoff Dates.
        Validator::extend('unique_payroll_cutoff', function ($attribute, $value, $parameters, $validator) {
            $inputs = $validator->getData();      
            $query_count = DB::table($parameters[0])->where(function ($query) use ($inputs) {
                            $query
                                # If there record between "start_date"
                                ->where(function ($query) use ($inputs) {
                                    $query->whereDate('start_date', '<=' ,$inputs['start_date'])
                                    ->whereDate('end_date', '>=' ,$inputs['start_date']);
                                })
                                # If there record between "end_date" date
                                ->orwhere(function ($query) use ($inputs) {
                                    $query->whereDate('start_date', '<=' ,$inputs['end_date'])
                                    ->whereDate('end_date', '>=' ,$inputs['end_date']);
                                })
                                # If there record within submitted dates
                                ->orwhere(function ($query) use ($inputs) {
                                    $query->whereDate('start_date', '<=' ,$inputs['start_date'])
                                    ->whereDate('end_date', '>=' ,$inputs['end_date']);
                                })
                                # If there is dates between submitted dates
                                ->orwhere(function ($query) use ($inputs) {
                                    $query->whereDate('start_date', '>=' ,$inputs['start_date'])
                                    ->whereDate('end_date', '<=' ,$inputs['end_date']);
                                });
                            })->where('id', '<>', request()->route('id') ?? null)
                            ->whereNull('deleted_at')
                        ->get()->count();
            if($query_count>0){
                return false;
            }
          
            return true;
        });
    }

    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }
}
