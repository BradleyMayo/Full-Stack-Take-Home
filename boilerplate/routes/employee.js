'use strict';

const { v4: uuidv4 } = require('uuid');
const express = require('express');
const router = express.Router();
const axios = require('axios');
const moment = require('moment');

const DATABASE = {};
const dateRegex = /^\d\d\d\d-\d\d-\d\d$/;
const roleRegex = /^CEO|VP|MANAGER|LACKEY$/i;
const CEORegex = /^CEO$/i;

/* GET employees listing. */
router.get('', function(req, res) {
  return res.send(DATABASE);
});

router.post('', async function(req, res) {
  return updateEmployee(res, req.body.firstName, req.body.lastName, req.body.hireDate, req.body.role);
});

router.get('/:id', function (req, res) {
  if (DATABASE[req.params.id] !== undefined) {
    return res.status(200).send(DATABASE[req.params.id])
  }
  else return res.status(400).send("Invalid employee ID");
});

router.put('/:id', function (req, res) {
  return updateEmployee(res, req.body.firstName, req.body.lastName, req.body.hireDate, req.body.role, req.params.id);
});

router.delete('/:id', function (req, res) {
  if (typeof(req.params.id) == 'string' && DATABASE[req.params.id] != undefined) {
    delete DATABASE[req.params.id];
    return res.status(200).send("Employee deleted");
  }
  else return res.status(400).send("Invalid employee ID, nothing to delete");
});

//Check if the database already has an employee with the CEO role, return true if it does and false if it doesn't
function hasCEO () {
  for (const _id of Object.keys(DATABASE)) {
    if (CEORegex.test(DATABASE[_id].role)) return true;
  }
  return false;
}

async function updateEmployee(res, firstName, lastName, hireDate, role, _id) {
  //Validate firstName
  if (!firstName || typeof firstName != "string") {
    return res.status(400).send("firstName is required and should be a string");
  }
  //Validate lastName
  else if (!lastName || typeof lastName != "string") {
    return res.status(400).send("lastName is required and should be a string");
  }
  //Validate hireDate
  else if (!hireDate || typeof hireDate != "string" || !moment(hireDate, "YYYY-MM-DD").isValid() || !dateRegex.test(hireDate) || Date.parse(hireDate) >= new Date().getTime()) {
    return res.status(400).send("hireDate is required, should be in the format 'yyyy-mm-dd', and should be a valid date in the past");
  }
  //Validate role
  else if (!role || typeof role != "string" || !roleRegex.test(role) || (CEORegex.test(role) && hasCEO())) {
    return res.status(400).send("role is required, should be either 'CEO', 'VP', 'MANAGER', or 'LACKEY', and there can only be one CEO");
  }
  //Add new employee to database when all parameters are valid
  else {
    let employee = {};
    //Check if this is a PUT request for an existing ID
    if (_id !== undefined) {
      //Check if the ID is valid
      if (typeof(_id == 'string') && DATABASE[_id] !== undefined) {
        employee._id = _id;
      }
      //Fail if the ID is invalid for the PUT request
      else return res.status(400).send("Invalid employee ID");
    }
    //If its not a PUT request, generate a new unique ID
    else {
      do {
        employee._id = uuidv4();
      } while (DATABASE[employee._id] !== undefined);
    }
  
    //Make async requests to external APIs for quote and joke
    const [res1, res2] = await Promise.all([
      axios.get('https://ron-swanson-quotes.herokuapp.com/v2/quotes'),
      axios.get('https://icanhazdadjoke.com', {headers: {'Accept': 'application/json'}})
    ]);

    //Fill out employee information
    employee.firstName= firstName;
    employee.lastName = lastName;
    employee.hireDate = hireDate;
    employee.role = role;
    employee.quote = res1.data[0];
    employee.joke = res2.data.joke;
  
    //Add the new employee to the database
    DATABASE[employee._id] = employee;
  
    //Return the added employee so user can see their ID that was added
    return res.send(DATABASE[employee._id]);
  }
}

module.exports = router;
