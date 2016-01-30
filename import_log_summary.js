var Logs = new Mongo.Collection("logs");
var Comments = new Mongo.Collection("comments");

function getServices(services) {
    Fiber(function () {
        services = [];
        request('http://some-server/vshell/index.php?type=services&mode=json', function (error, response, body) {
            var resJSON = JSON.parse(body);
            _.each(resJSON, function (data) {
                var host = data["host_name"];
                var service = data["service_description"];
                var hardState = data["last_hard_state"];
                var currState = data["current_state"];
                services += { host: host, service: service, hardState: hardState, currState: currState };
                Services.insert({ host: host, service: service, hardState: hardState, currState: currState });
            });
        });
    }).run();
}

if (Meteor.isClient) {
    $(window).load(function () {
        $('#chat-area')[0].style.display = 'none';
    });
    Template.body.helpers({
        logs: function () {
            var log = Logs.find({}, { sort: { date: -1 } }).fetch().filter((x, i, arr) => {
                return arr.indexOf(arr.find((y, j, arr2) => {
                    return y.name === x.name && y.sub_name === x.sub_name;
                })) == i;
            });
            if (Session.get("selected_infoType_filter")) {
                log = log.filter((x, i, arr) => {
                    return x.info_type === Session.get("selected_infoType_filter");
                });
            }

            return log.map((l) => {
                return {
                    log_id: l._id,
                    date: l.date.toFormat('YYYY/MM/DD HH24:MI:SS'),
                    info_type: l.info_type,
                    category: l.category,
                    name: l.name,
                    sub_name: l.sub_name,
                    description: l.description
                };
            });
        },
        comments: function () {
            if (Session.get("selected_log_id")) {
                var comment = Comments.find({ "log_id": Session.get("selected_log_id") }).fetch();
                return comment.map((c) => {
                    return { date: c.date.toFormat('YYYY/MM/DD HH24:MI:SS'), name: c.name, text: c.text }
                });
            }
        }
    });
    Template.body.events = {
        'change select#ddlInfoTypeFilter': function (e) {
            Session.set("selected_infoType_filter", $(e.currentTarget).val());
            Tracker.flush();
        },
        'click #btn-export': function (e) {
            window.open('/get/log/summary', 'download');
        }
    }

    Template.log.events = {
        'click button.chat-start': function (e) {
            Session.set("selected_log_id", $(e.currentTarget).attr('log-id'));
            $('#chat-area')[0].style.display = '';
            $("button.chat-start").removeClass("btn-warning")
            $("button.chat-start").addClass("btn-default");
            $(e.currentTarget).addClass('btn-warning');
            Tracker.flush();
        }
    }

    Template.chat_input.events = {
        'click button#submit': function (evt) {
            var name = $("#name").val();
            var text = $("#text").val();

            if (name == "" || text == "") return;
            if (Session.get("selected_log_id")) {

                Comments.insert({ log_id: Session.get("selected_log_id"), name: name, text: text, date: new Date() });
                $("#text").val("");
                $("#text").focus();
            }

        }
    };
}

if (Meteor.isServer) {
    var queryString = Meteor.npmRequire('querystring');
    var fs = Meteor.npmRequire('fs');
    Meteor.startup(function () {

    });

    Picker.route('/post/log/', function (params, req, res, next) {
        var data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', Meteor.bindEnvironment(function (error, body) {
            if (req.method === 'POST') {
                var json = JSON.parse(queryString.parse(data).result);
                console.log(json);
                Logs.insert({
                    date: new Date(),
                    info_type: json.info_type,
                    category: json.category,
                    name: json.name,
                    sub_name: json.sub_name,
                    description: json.description,
                });
                res.end("ok");
            }
            else {
                res.end('ng');
            }
        }));
    });
    Picker.route('/get/log/summary/', function (params, req, res, next) {
        var textdata = "write text test!";

        var download = () => {
            fs.writeFile(Meteor.rootPath + '\\temp\\writetest.txt', textdata, function (err) {
                if (err) { console.log('writefile happens error :' + err); }
                fs.readFile(Meteor.rootPath + '\\temp\\writetest.txt', (err, data) => {
                    if (err) { console.log('readfile happens error :' + err); }
                    res.writeHead(200,
                        {
                            'Content-Type': 'application/octet-stream',
                            'Content-Disposition': 'attachment; filename=hogehoge.txt'
                        });
                    res.write(data);
                    res.end();
                });
            });
        }

        if (!fs.exists(Meteor.rootPath + '\\temp')) {
            fs.mkdir(Meteor.rootPath + '\\temp', (e) => {
                if (e) { console.log('mkdir happens error :' + e); }
                download();
            });
        } else {
            download();
        }
    });
    // JsonRoutes.add("get", "/get/log/summary/", function (req, res, next) {
    //     
    //     JsonRoutes.setResponseHeaders({
    //         "Content-Type":"text/plain"
    //     });
    //     JsonRoutes.sendResult(res, {
    //         headers:{
    //             "Content-Type":"text/plain",
    //             "Content-Encoding":"shift-jis"
    //         },
    //         data: 'hoge'
    //     });
    // });
}
