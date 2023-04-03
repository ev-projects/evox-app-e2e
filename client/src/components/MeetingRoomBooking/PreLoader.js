import React from "react";
import { usePromiseTracker } from "react-promise-tracker";
import Loader from 'react-loader-spinner';
import { useLocation } from 'react-router-dom';



const PreLoader = () => {
  return (
    <div className={'fadeInLoader overlay'}>
        <div className="spanner">
          <Loader
            type="ThreeDots"
            color="#82af13"
            height={35}
            width={75}
          />
          Loading
        </div>
      </div>
  )
}

export default PreLoader