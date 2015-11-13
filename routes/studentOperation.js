/*
 * This file is for action in course service, including CRUD
 */

var qs = require('querystring');
var lr = require("line-reader");
var path = require('path');
var async = require('async');
var db = require('./../utils/mongo.js');
var log = require('./../utils/logMessage');
var StudentParams = require('./../utils/studentParams');

var serviceType = 'student';

// handle create a new student
exports.createStudent = function(req, res) {
    // get content from body
    var body = '';
    var uni = req.params.uni;

    req.on('data', function (data) {
        body += data;

        // Too much POST data, kill the connection!
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6)
            request.connection.destroy();
    });

    // handle operations
    req.on('end', function () {
        // get parameters
        var post = qs.parse(body);
        var name = post['name'];
        var coursesEnrolled = post['coursesEnrolled'];
        var params = new StudentParams(uni, name, coursesEnrolled, log.ADD_STUDENT);

        console.log(params);

        // get mongoDB collection
        var student = db.collection(serviceType);

        // create new student
        insertStudent(res, params, student);
    });
};

// handle delete an existing student
exports.deleteStudent = function(req, res) {
    // define parameters
    var uni = req.params.uni;
    var params = new StudentParams(uni, null, null, log.DELETE_STUDENT);

    // get mongoDB collection
    var student = db.collection(serviceType);

    console.log(params);
    deleteStudent(res, params, student);
};

// handle read student information
exports.readStudent = function(req, res) {
    // define parameters
    var uni = req.params.uni;
    var params = new StudentParams(uni, null, null, log.READ_STUDENT);

    // get mongoDB collection
    var student = db.collection(serviceType);

    console.log(params);
    getStudent(res, params, student);
};

// handle update student information
exports.updateStudent = function(req, res) {
    // get content from body
    var body = '';
    var uni = req.params.uni;

    req.on('data', function (data) {
        body += data;

        // Too much POST data, kill the connection!
        // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
        if (body.length > 1e6)
            request.connection.destroy();
    });

    // handle operations
    req.on('end', function () {
        // get parameters
        var post = qs.parse(body);
        var name = post['name'];
        var params = new StudentParams(uni, name, null, log.UPDATE_STUDENT);

        console.log(params);

        // get mongoDB collection
        var student = db.collection(serviceType);

        // update student
        updateStudent(res, params, student);
    });
};

// handle delete course in course list
exports.deleteCourse = function(req, res) {
    // get parameters
    var uni = req.params.uni;
    var course = req.params.cid;
    var params = new StudentParams(uni, null, course, log.DELETE_COURSE_FROM_STUDENT);

    console.log(params);

    // get mongoDB collection
    var student = db.collection(serviceType);

    // delete course from list
    deleteCourse(res, params, student);
};

// handle add course in course list
exports.addCourse = function(req, res) {
    // get parameters
    var uni = req.params.uni;
    var course = req.params.cid;
    var params = new StudentParams(uni, null, course, log.ADD_COURSE_INTO_STUDENT);

    console.log(params);

    // get mongoDB collection
    var student = db.collection(serviceType);

    // add course into course list
    insertCourse(res, params, student);
};

// handle revert the last operation
exports.revert = function(req, res) {
    var file = 'log/' + serviceType + '.log';

    lr.eachLine(path.join(path.dirname(__dirname), file), function(line, last) {
        if (last) {
            console.log(line);

            // handle revert
            var history = JSON.parse(line);
            var operation = history.operation;
            var params = new StudentParams(history.uni, history.name, history.course, null);

            params.addHistory(history.oldParam);

            // get mongoDB collection
            var student = db.collection(serviceType);

            switch(operation) {
                case log.ADD_STUDENT:
                    // revert add student
                    params.addOperation(log.DELETE_STUDENT);
                    deleteStudent(res, params, student);

                    break;
                case log.DELETE_STUDENT:
                    // revert delete student
                    params.addOperation(log.ADD_STUDENT);
                    insertStudent(res, params, student);

                    break;
                case log.UPDATE_STUDENT:
                    // revert update
                    var history = params.getHistory();
                    var oldParams = new StudentParams(history.uni, history.name);
                    updateStudent(res, oldParams, student);

                    break;
                case log.ADD_COURSE_INTO_STUDENT:
                    // revert add course to course list
                    params.addOperation(log.DELETE_COURSE_FROM_STUDENT);
                    deleteCourse(res, params, student);

                    break;
                case log.DELETE_COURSE_FROM_STUDENT:
                    // revert delete course from course list
                    console.log(params);

                    params.addOperation(log.ADD_COURSE_INTO_STUDENT);
                    insertCourse(res, params, student);

                    break;
                default:
                    res.send('can not revert last operation');

                    break;
            }
        }
    });
};

// handle configuration
exports.config = function(req, res) {
    // to do: configure schema
};

// function: insert a student entry
function insertStudent(res, params, student) {
    // define response object
    var response = new Object();

    // insert new student into db
    student.count({uni: params.getUni()}, function(err, count) {
        if(count==0){
            // no conflicts

            var name = params.getName();
            var uni = params.getUni();
            var courses = params.getCourse().split(",");

            student.insert({name: name, uni: uni, coursesEnrolled: courses},
                function(err, result) {
                    if (err) { // error situation
                        response.status = "failed";
                        response.message = err.toSring();

                        res.send(response);

                        return;
                    }

                    if (result){ // normal situation
                        response.status = "succeed";
                        response.message = "student ["+ uni + "] " + name +" added";

                        // log operation
                        log.logMsg(JSON.stringify(params)+"\n", serviceType);

                        // send back message
                        res.send(response);
                    }});
        } else{ // exist conflicts
            response.status = "failed";
            response.message = "uni existed";
            // send back message
            res.send(response);
        }
    });
}

// function: get student information
function getStudent(res, params, student) {
    // define response
    var response = new Object();

    if(params.getUni() == "#") {
        // get all cids
        student.find({}, {uni: true}).toArray(function(err, results) {
            if(err) {
                response.status = "failed";
                response.message = err.toSring();
            } else {
                response.status = "succeed";
                response.message = "list all students uni";
                response.body = results;
            }

            // log operation
            log.logMsg(JSON.stringify(params) + "\n");
            // send back message
            res.send(response);
        });
    } else {
        // get information according to uni

        student.count({uni: params.getUni()}, function (err, count) {
            if (count > 0) {
                student.find({uni: params.getUni()}).toArray(function (err, result) {
                    if (err) {
                        response.status = "failed";
                        response.message = err.toSring();
                        res.send(response);
                    }
                    else {
                        response.status = "succeed";
                        response.message = count + " Student found";
                        response.body = result;
                        // log history
                        log.logMsg(JSON.stringify(params) + "\n", serviceType);
                        // send back response
                        res.send(response);
                    }
                });
            } else {
                response.status = "failed";
                response.message = "no student match your request";
                // log history
                log.logMsg(JSON.stringify(params) + "\n", serviceType);
                // send back response
                res.send(response)
            }
        });
    }
}

// function: delete an existing student
function deleteStudent(res, params, course) {
    var response = new Object();
    var uni = params.getUni();

    course.findOne({uni: uni}, function(err, result) {
        if(result){
            course.remove({uni: uni},function(err, r) {
                if (err) {
                    response.status = "failed";
                    response.message = err.toSring();

                    return;
                }
                else{
                    // add history into parameters
                    var tmp = new Object();
                    params.name = result["name"];
                    params.uni = result["uni"];
                    params.course = result["coursesEnrolled"].join();

                    response.status = "succeed";
                    response.message = "student "+ uni +" removed";
                    // log history
                    log.logMsg(JSON.stringify(params)+"\n", serviceType);
                }
                // send back response
                res.send(response);
            });
        }
        else{
            response.status = "failed";
            response.message = "no student match your request";
            // send back response
            res.send(response);
        }
    });
}

// function: insert student into course list
function insertCourse(res, params, student) {
    var response = new Object();
    var uni = params.getUni();

    student.findOne({uni: uni}, function(err, result) {
        if (err) { // handling error
            response.status = "failed";
            response.message = err.toSring();
            res.send(response);

            return;
        }

        if(result) { // find record
            var newCourse = params.getCourse();
            var courseList = result.coursesEnrolled;

            if(courseList.indexOf(newCourse) == -1) {
                courseList.push(newCourse);

                student.update({uni: uni},{'$set':{coursesEnrolled: courseList}},function(err,result){
                    if(err){
                        response.status = "failed";
                        response.message = err.toSring();
                        res.send(response);

                        return;
                    }

                    if(result){
                        response.status = "succeed";
                        response.message = "course " + newCourse + " is added to student(uni:" + uni + ").";

                        // log history
                        log.logMsg(JSON.stringify(params)+"\n", serviceType);

                        res.send(response);
                    }
                });
            } else {
                response.status = "failed";
                response.message = "course is already enrolled by student(uni:" + uni + ").";
                res.send(response);
            }
        } else{ // no record
            response.status = "failed";
            response.message = "Uni "+ uni +" does not exist.";
            res.send(response);
        }
    });
}

// function: delete course from course list
function deleteCourse(res, params, student) {
    var response = new Object();
    var uni = params.getUni();
    var oldCourse = params.getCourse();

    // check if need to delete student in all courses ?
    if(uni == 'all') {
        student.find({coursesEnrolled: oldCourse}).toArray(function(err,result) {
            if(err){
                response.status = "failed";
                response.message = err.toSring();
                res.send(response);

                return;
            }

            if(result.length > 0){
                var count = 0;

                result.forEach(function(resultStudent){
                    var courseArr = resultStudent.coursesEnrolled;
                    courseArr.splice(courseArr.indexOf(oldCourse),1);
                    student.update({uni: resultStudent["uni"]},{'$set':{coursesEnrolled: courseArr}},function(err,r){
                        if(!err) {
                            count++;
                            if(count == result.length){
                                response.status = "succeed";
                                response.message = "Course " + oldCourse + " is deleted and deleted from all Students.";
                                log.logMsg(JSON.stringify(params)+"\n", serviceType);

                                res.send(response);
                            }
                        }
                    });
                });
            } else{
                response.status = "succeed";
                response.message = "No student is enrolled in course "+ oldCourse;

                res.send(response);
            }
        });

        return;
    }

    student.findOne({uni: uni}, function(err, result) {
        if (err) { // handling error
            response.status = "failed";
            response.message = err.toSring();
            res.send(response);

            return;
        }

        if(result) { // find record
            var courseList = result.coursesEnrolled;

            if(courseList.indexOf(oldCourse) != -1) {
                courseList.splice(courseList.indexOf(oldCourse),1);

                student.update({uni: uni},{'$set':{coursesEnrolled: courseList}},function(err,result){
                    if(err){
                        response.status = "failed";
                        response.message = err.toSring();
                        res.send(response);

                        return;
                    }

                    if(result){
                        response.status = "succeed";
                        response.message = "Course " + oldCourse + " is deleted from student(uni:" + uni + ").";

                        // log history
                        log.logMsg(JSON.stringify(params)+"\n", serviceType);

                        res.send(response);
                    }
                });
            } else {
                response.status = "failed";
                response.message = "course is not enrolled by student(uni:" + uni + ").";
                res.send(response);
            }
        } else{ // no record
            response.status = "failed";
            response.message = "Uni "+ uni +" does not exist.";
            res.send(response);
        }
    });
}

// function: update student
function updateStudent(res, params, student) {
    var uni = params.getUni();
    var name = params.getName();

    student.findOne({uni: uni}, function (err, oldEntry) {
        var response = new Object();

        if (err) {
            response.status = "failed";
            response.message = err.toSring();

            res.send(response);
            return;
        }

        if (oldEntry) {
            async.parallel([
                //update name
                function (callback) {
                    // check if name exists
                    if(name == null || name == '') {
                        callback(null, null);
                        return;
                    }

                    student.update({uni: uni}, {'$set': {name: name}}, function (err, r) {
                        if (err) {
                            response.status = "failed";
                            response.message = err.toSring();

                            callback(null, response);
                        } else {
                            response.status = "succeed";
                            response.message = "student " + uni + "'s name has been changed to " + name;

                            callback(null, response);
                        }
                    });
                }],

                // handle response and log
                function (err, results) {
                    if (err) {
                        response.status = "failed";
                        response.message = err.toSring();

                        return res.send(response);
                    }

                    if(results) {
                        var resString = "";
                        var oldParams = new StudentParams(uni, oldEntry['name'], null, null);
                        params.addHistory(oldParams);

                        if(results[0]) {
                            resString += JSON.stringify(results[0]);
                        }

                        log.logMsg(JSON.stringify(params)+'\n', serviceType);
                        res.send(resString);
                    }
                });
        } else {
            response.status = "failed";
            response.message = "Uni " + uni + " does not exist.";

            res.send(response);
        }
    });
}