
import React from "react";
import { Button } from 'react-bootstrap';
import { connect } from 'react-redux';
import { setRedirect } from '../../../store/actions/redirectActions';
import { Pagination } from 'react-bootstrap';
import { Field, useFormikContext } from 'formik';
import "./Paginate.css";


// Component for the Paginate
const Paginate = (context) => { 
    

    function generatePage ( page, label ) {
      return <Field>
              {({ field, form }) => (
                <div className="page">
                  <Button type="submit" className="pagination_btn text-center" active={page === context.pagination.current_page} onClick={() => form.setFieldValue("page",page)}>{label}</Button>
                </div>
              )}
            </Field>
    }

    const max_pages = 10;

    var paginate = [];
    var page_counter = 0;

    var start_page = 0;
    var end_page = 0;


    // If there's a loaded Pagination props, Generate the Pagination component.
    if( context.pagination != undefined  ){

      end_page = Math.ceil(context.pagination.current_page / 10) * max_pages;
      start_page = (end_page - max_pages) + 1 ;

      // If the Last Page is less than the End Page, set the End Page as Last Page
      if( context.pagination.last_page < end_page ){
        end_page = context.pagination.last_page;
      }

      // If the Current Page is more than 1, show the First and Prev button
      if( context.pagination.current_page > 1 ){
        paginate.push( generatePage ( 1, '<< First' ) );
        paginate.push( generatePage ( (context.pagination.current_page - 1), '< Prev' ) );
      }

      // Show the Pages 
      for (let number = start_page; number <= end_page; number++) {
        if( page_counter < max_pages ) {
          paginate.push( generatePage( number, number) );
          page_counter++;
        }
      }
        
      // If the Current Page is less than the last page, show the First and Prev button
      if( context.pagination.current_page < context.pagination.last_page ){
        paginate.push( generatePage ( (context.pagination.current_page + 1), 'Next >' ) );
        paginate.push( generatePage ( context.pagination.last_page, 'Last >>' ) );
      }
        
    }

    return <Pagination className="justify-content-center pagination" >{paginate}</Pagination>;
}

export default Paginate;