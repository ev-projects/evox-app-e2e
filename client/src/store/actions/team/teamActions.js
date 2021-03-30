import API from "../../../services/API";
import Formatter from "../../../services/Formatter";


/**
 *  A dedicated repository of Actions for Teams
 */

// Create pa
export const createTeam = ( post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/team/",
            data: post_data
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}

export const updateTeam = ( team_id, post_data ) => {
    return (dispatch, getState) => {
        API.call({
            method: "post",
            url: "/team/" + team_id,
            data: post_data
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


export const deleteTeam = ( team_id ) => {
    return (dispatch, getState) => {
        API.call({
            method: "delete",
            url: "/team/" + team_id
        })
        .then(result => {

            dispatch( Formatter.alert_success( result, 3000 ));

        })
        .catch(e => {
            dispatch( Formatter.alert_error( e ) ) 
        });
    }
}


