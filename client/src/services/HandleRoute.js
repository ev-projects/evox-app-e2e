import React from "react";
import { Route } from 'react-router-dom';

const withRouter = ( ConnectedComponent ) => {
  const witRouterComponent = (props) => (
    <Route render={routeProps =>
      <ConnectedComponent {...routeProps} {...props} />} />
  );
  return witRouterComponent;
};

export default withRouter;