import React from 'react'
import { Form, Button,Alert} from "react-bootstrap";
const AlertCalander = () => {
  return (
    <Alert variant="danger" style={{ width: "42rem" }}>
        <Alert.Heading>
          This is a danger alert which has red background
        </Alert.Heading>
      </Alert>
  )
}

export default AlertCalander