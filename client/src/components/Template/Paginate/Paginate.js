
import React from "react";
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';
import { setRedirect } from '../../../store/actions/redirectActions';
import { Pagination } from 'react-bootstrap';
import { Field, useFormikContext } from 'formik';
import "./Paginate.css";

// Component for the Paginate
const Paginate = (context) => { 
    var paginate = [];
  
    // If there's a loaded Pagination props, Generate the Pagination component.
    if( context.pagination != undefined  ){

        for (let number = 1; number <= context.pagination.last_page; number++) {
          paginate.push(
            <Field>
              {({ field, form }) => (
                <div>
                  <Button type="submit" className="pagination_btn text-center" active={number === context.pagination.current_page} onClick={() => form.setFieldValue("page",number)}>{number}</Button>
                </div>
              )}
            </Field>
          );
        }
    }

    return <Pagination className="justify-content-center" >{paginate}</Pagination>;
}

export default Paginate;