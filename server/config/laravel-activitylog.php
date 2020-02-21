<?php

return [
    /**
     * When set to false, no activities will be saved to database.
     */
    'enabled' => env('ACTIVITY_LOGGER_ENABLED', true),

    /**
     * When running the clean-command all recording activites older than
     * the number of days specified here will be deleted.
     */
    'delete_records_older_than_days' => 365,


    /**
     * When not specifying a log name when logging activity
     * we'll using this log name.
     */
    'default_log_name' => 'default',


    /**
     * When set to true, the subject returns soft deleted models.
     */
     'subject_returns_soft_deleted_models' => true,
     
     
    /**
     * This model will be used to log activity. The only requirement is that
     * it should be or extend the Spatie\Activitylog\Models\Activity model.
     */
    'activity_model' => \Spatie\Activitylog\Models\Activity::class,    
];
