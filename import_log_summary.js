var Logs = new Mongo.Collection("logs");
var Comments = new Mongo.Collection("comments");

if (Meteor.isClient) {
    $(window).load(function () {
        $('#chat-area')[0].style.display = 'none';
        var publicSetting = Meteor.settings.public;
        if (publicSetting.app_title) {
            $("#app_title").html(publicSetting.app_title);
        }
        if (publicSetting.tab1_title) {
            $("#tab1_title").html(publicSetting.tab1_title);
        }
        if (publicSetting.tab2_title) {
            $('#tab2_title').html(publicSetting.tab2_title);
        }
        if (publicSetting.date_head) {
            $('#date_head').html(publicSetting.date_head);
        }
        if (publicSetting.category_head) {
            $('#category_head').html(publicSetting.category_head);
        }
        if (publicSetting.infoType_head) {
            $("#infoType_head").html(publicSetting.infoType_head);
        }
        if (publicSetting.name_head) {
            $("#name_head").html(publicSetting.name_head);
        }
        if (publicSetting.subName_head) {
            $("#subName_head").html(publicSetting.subName_head);
        }
        if (publicSetting.description_head) {
            $("#description_head").html(publicSetting.description_head);
        }
        if (publicSetting.chat_head) {
            $("#chat_head").html(publicSetting.chat_head);
        }
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
    Picker.route('/get/token/', function (params, req, res, next) {
        var data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', Meteor.bindEnvironment(function (error, body) {
            if (req.method === 'POST') {
                var key = queryString.parse(data).key;
                res.writeHead(200);
                res.end(CryptoJS.SHA256(key).toString());
            }
            else {
                res.writeHead(405);
                res.end();
                return;
            }
        }));
    });
    Picker.route('/post/log/', function (params, req, res, next) {
        var data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', Meteor.bindEnvironment(function (error, body) {
            if (req.method === 'POST') {
                var result = queryString.parse(data).result;
                var token = queryString.parse(data).token;
                if (token !== CryptoJS.SHA256(Meteor.settings.private.apipass).toString()) {
                    res.writeHead(403);
                    res.end();
                    return;
                }
                var json = JSON.parse(result);
                console.log(json);
                Logs.insert({
                    date: new Date(),
                    info_type: json.info_type,
                    category: json.category,
                    name: json.name,
                    sub_name: json.sub_name,
                    description: json.description,
                });
                res.writeHead(202);
                res.end();
                return;
            }
            else {
                res.writeHead(405);
                res.end();
                return;
            }
        }));
    });
    Picker.route('/get/log/summary/', function (params, req, res, next) {
        var textdata = "write text test!";
        var download =
            Meteor.bindEnvironment(() => {
                var log = Logs.find({}, { sort: { date: -1 } }).fetch().filter((x, i, arr) => {
                    return arr.indexOf(arr.find((y, j, arr2) => {
                        return y.name === x.name && y.sub_name === x.sub_name;
                    })) == i;
                });
                var loglist = log.map((l) => {
                    return {
                        log_id: l._id,
                        date: l.date.toFormat('YYYY/MM/DD HH24:MI:SS'),
                        info_type: l.info_type == 'complete' ? '○' : l.info_type,
                        category: l.category,
                        name: l.name,
                        sub_name: l.sub_name,
                        description: l.description
                    };
                });
                //start
                textdata += "\n\n★実行中";
                for (var l of loglist.filter(a => a.info_type == 'start')) {
                    textdata += "\n" + l.name + "\n=> " + l.description;
                }
                //error
                textdata += "\n\n\n★エラー";
                for (var l of loglist.filter(a => a.info_type == 'error')) {
                    textdata += "\n" + l.name + "\n=> " + l.description;
                }                
                //全体
                textdata += "\n\n\n★全体の状況";

                for (var l of loglist) {
                    textdata += "\n" + l.name + "\t" + l.info_type + "\t" + l.description;
                }

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
            });


        if (!fs.exists(Meteor.rootPath + '\\temp')) {
            fs.mkdir(Meteor.rootPath + '\\temp', (e) => {
                if (e) { console.log('mkdir happens error :' + e); }
                download();
            });
        } else {
            download();
        }
    });
}
