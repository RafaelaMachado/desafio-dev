'use strict';

var host = "localhost";
var user = "root";
var pass = "root";

const Hapi = require('hapi');
const Joi = require('joi');

const plate_schema = Joi.object().keys({
    license_plate: Joi.string().regex(/^[A-Z]{3}-[0-9]{4}$/),
});

var mysql = require('mysql');

const cdb = mysql.createConnection({
  host: host,
  user: user,
  password: pass,
});
cdb.connect(function(err) {
    if (err) throw err;
    conn.query("CREATE DATABASE IF NOT EXISTS softi_schema", function (err, result) {
        if (err) throw err;
        console.log("DATABASE created");
    });
});
cdb.end();

const conn = mysql.createConnection({
  host: host,
  user: user,
  password: pass,
  database: 'softi_schema',
});

conn.connect(function(err) {
    if (err) throw err;
    conn.query("CREATE TABLE IF NOT EXISTS vehicle (id INT NOT NULL AUTO_INCREMENT, name VARCHAR(128) NOT NULL, license_plate VARCHAR(8) UNIQUE NOT NULL, brand_id INT NOT NULL, model_id INT NOT NULL, PRIMARY KEY (id))", function (err, result) {
        if (err) throw err;
        console.log("Table created");
    });
});

function getVehicles(callback) {
    var sql = "SELECT id, name, license_plate, brand_id, model_id FROM vehicle";
    conn.query(sql, function (err, rows, fields) {
        if (err) throw err;
        return callback(null, rows);
    });
}

function getVehicle(id, callback) {
    var sql = "SELECT id, name, license_plate, brand_id, model_id FROM vehicle WHERE id=?";
    conn.query(sql, [id], function (err, rows, fields) {
        if (err) throw err;
        return callback(null, rows[0]);
    });
}

function getVehicleByPlate(plate, callback) {
    var sql = "SELECT id, name, license_plate, brand_id, model_id FROM vehicle WHERE license_plate=?";
    conn.query(sql, [plate], function (err, rows, fields) {
        if (err) throw err;
        return callback(null, rows);
    });
}

function getVehicleByPlateId(id, plate, callback) {
    var sql = "SELECT id, name, license_plate, brand_id, model_id FROM vehicle WHERE license_plate=? AND id != ?";
    conn.query(sql, [plate, id], function (err, rows, fields) {
        if (err) throw err;
        return callback(null, rows);
    });
}

function insertVehicle(data) {
    var sql = "INSERT INTO vehicle (name, license_plate, brand_id, model_id) VALUES (?, ?, ?, ?)";
    conn.query(sql, [data.name, data.license_plate.toUpperCase(), data.brand_id, data.model_id], function (err, result) {
          if (err) throw err;
          console.log("1 record inserted");
    });
}

function updateVehicle(id, data) {
    var sql = "UPDATE vehicle SET name=?, license_plate=?, brand_id=?, model_id=? WHERE id=?";
    conn.query(sql, [data.name, data.license_plate.toUpperCase(), data.brand_id, data.model_id, id], function (err, result) {
          if (err) throw err;
          console.log("1 record updated");
    });
}

function deleteVehicle(id) {
    var sql = "DELETE FROM vehicle WHERE id=?";
    conn.query(sql, [id], function (err, result) {
          if (err) throw err;
          console.log("1 record DELETED");
    });
}

function getVehicleDict(row) {
    return {
        id: row.id,
        name: row.name,
        license_plate: row.license_plate,
        brand_id: String(row.brand_id),
        model_id: String(row.model_id)
    };
}

// Create a server with a host and port
const server = new Hapi.Server();
server.connection({
    host: 'localhost',
    port: 8000
});

// Add the route
server.route({
    method: 'GET',
    path:'/vehicles',
    config: {
        cors: {
            origin: ['*'],
            additionalHeaders: ['cache-control', 'x-requested-with']
        }
    },
    handler: function (request, reply) {

        var data = [];
        getVehicles(function(err, rows) {
            if (err) throw err;

            for (var row of rows) {
                data.push(getVehicleDict(row));
            }
            return reply(data).code(200);
        });
    }
});

server.route({
    method: 'GET',
    path:'/vehicles/{id}',
    config: {
        cors: {
            origin: ['*'],
            additionalHeaders: ['cache-control', 'x-requested-with']
        }
    },
    handler: function (request, reply) {
        getVehicle(request.params.id, function(err, row) {
            if (err) throw err;

            return reply(getVehicleDict(row));
        });
    }
});

server.route({
    method: 'PUT',
    path:'/vehicles/{id}',
    config: {
        cors: {
            origin: ['*'],
            additionalHeaders: ['cache-control', 'x-requested-with']
        }
    },
    handler: function (request, reply) {

        var id = request.params.id;
        var data = request.payload;
        var plate = data.license_plate.toUpperCase();
        Joi.validate({license_plate: plate}, plate_schema, function (err, value) {
            if (err) {
                return reply({
                    "statusCode":500,
                    "error":"Placa incorreta",
                    "message": "informe um placa correta no formato 'AAA-9999'!"
                }).code(500);
            } else {
                getVehicleByPlateId(id, plate, function (err, rows) {
                    if (err) throw err;
                    if (rows.length > 0) {
                        return reply({
                            "statusCode":500,
                            "error":"Placa ja registrada!",
                            "message":"Placa \""+plate+"\" ja registrada!"
                        }).code(500);
                    } else {
                        updateVehicle(id, data);
                        return reply({}).code(200);
                    }
                });
            }
        });
    }
});

server.route({
    method: 'POST',
    path:'/vehicles',
    config: {
        cors: {
            origin: ['*'],
            additionalHeaders: ['cache-control', 'x-requested-with']
        }
    },
    handler: function (request, reply) {
        var data = request.payload;
        var plate = data.license_plate.toUpperCase();

        Joi.validate({license_plate: plate}, plate_schema, function (err, value) {
            if (err) {
                return reply({
                    "statusCode":500,
                    "error":"Placa incorreta",
                    "message": "informe um placa correta no formato 'AAA-9999'!"
                }).code(500);
            } else {
                getVehicleByPlate(plate, function (err, rows) {
                    if (err) throw err;
                    if (rows.length > 0) {
                        return reply({
                            "statusCode":500,
                            "error":"Placa ja registrada!",
                            "message":"Placa \""+plate+"\" ja registrada!"
                        }).code(500);
                    } else {
                        insertVehicle(data);
                        return reply({}).code(200);
                    }
                });
            }
        });
    }
})

server.route({
    method: 'DELETE',
    path:'/vehicles/{id}',
    config: {
        cors: {
            origin: ['*'],
            additionalHeaders: ['cache-control', 'x-requested-with']
        }
    },
    handler: function (request, reply) {
        var id = request.params.id;
        deleteVehicle(id);
        return reply({
        }).code(200);
    }
});

// Start the server
server.start((err) => {

    if (err) {
        throw err;
    }
    console.log('Server running at:', server.info.uri);
});
