/*
 * parameters data structure for student
 */

// Constructor
function StudentParams(uni, name, course, operation) {
    // always initialize all instance properties
    this.uni = uni;
    this.name = name;
    this.course = course;
    this.operation = operation;
    this.oldParam = null;
}

// get uni
StudentParams.prototype.getUni = function() {
    return this.uni;
};

// get name
StudentParams.prototype.getName = function() {
    return this.name;
};

// get course
StudentParams.prototype.getCourse = function() {
    return this.course;
};

// get operation
StudentParams.prototype.getOperation = function() {
    return this.operation;
};

// get history
StudentParams.prototype.getHistory = function() {
    return this.oldParam;
};

// change operation
StudentParams.prototype.addOperation = function(operation) {
    this.operation = operation;
};

// add history
StudentParams.prototype.addHistory = function(params) {
    this.oldParam = params;
};

// set name
StudentParams.prototype.setName = function(name) {
    this.name = name;
};

// export the class
module.exports = StudentParams;