export const showModalLogin = ( ) => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'SHOW_MODAL_LOGIN'
        });
    }
}

export const hideModalLogin = () => {
    return (dispatch, getState) => {
        dispatch({
            'type'      : 'HIDE_MODAL_LOGIN'
        });
    }
}
