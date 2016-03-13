var Logs = new Mongo.Collection("logs");
var Comments = new Mongo.Collection("comments");

function getDate(dt, addDays) {
    var baseSec = dt.getTime();
    var addSec = addDays * 86400000;//日数 * 1日のミリ秒数
    var targetSec = baseSec - addSec;
    dt.setTime(targetSec);
    return dt;
}
if (Meteor.isClient) {

    var publicSetting = Meteor.settings.public;
    Template.title.title = publicSetting.app_title;

    Template.tab.tab1_name = publicSetting.tab1_title;
    Template.tab.tab2_name = publicSetting.tab2_title;

    Template.log_header.date = publicSetting.date_head;
    Template.onelog_header.date = publicSetting.date_head;
    Template.log_header.info_type = publicSetting.infoType_head;
    Template.onelog_header.info_type = publicSetting.infoType_head;
    Template.log_header.category = publicSetting.category_head;
    Template.log_header.name = publicSetting.name_head;
    Template.log_header.sub_name = publicSetting.subName_head;
    Template.log_header.description = publicSetting.description_head;
    Template.onelog_header.description = publicSetting.description_head;
    Template.log_header.chat = publicSetting.chat_head;
    Template.body.helpers({
        logs: function() {
            //1日前のまで取得
            var tdate = getDate(new Date(), 1);
            var log = Logs.find({ date: { $gte: tdate } }, { sort: { date: -1 } }).fetch().filter((x, i, arr) => {
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
                    description: (l.description.length > 30 ? l.description.substring(0, 30) + "..." : l.description)
                };
            });
        },
        comments: function() {
            if (Session.get("selected_log_id")) {
                var comment = Comments.find({ "log_id": Session.get("selected_log_id") }).fetch();
                return comment.map((c) => {
                    return { date: c.date.toFormat('YYYY/MM/DD HH24:MI:SS'), name: c.name, text: c.text }
                });
            }
        },
        filters: function() {
            var tdate = getDate(new Date(), 1);
            var status = Logs.find({ date: { $gte: tdate } }).fetch().filter((x, i, arr) => {
                return arr.indexOf(arr.find((y, j, arr2) => {
                    return y.info_type === x.info_type;
                })) == i;
            });

            return status.map((l) => {
                return {
                    name: l.info_type,
                    val: l.info_type,
                };
            });
        },
    });

    Template.body.events = {
        'change select#ddlInfoTypeFilter': function(e) {
            Session.set("selected_infoType_filter", $(e.currentTarget).val());
            Tracker.flush();
        },
        'click #btn-export': function(e) {
            window.open('/get/log/summary', 'download');
        }
    }

    Template.log.events = {
        'click button.chat-start': function(e) {
            Session.set("selected_log_id", $(e.currentTarget).attr('log-id'));
            $('#chat-area')[0].style.display = '';
            $("button.chat-start").removeClass("btn-warning")
            $("button.chat-start").addClass("btn-default");
            $(e.currentTarget).addClass('btn-warning');
            Tracker.flush();
        },
        'click div.descript': function(e) {
            var id = $(e.currentTarget).attr('log-id');
            var l = Logs.findOne(id).description;
            Modal.show('logDescription');
$("#log-desc")[0].innerHTML = l.replace(/\r\n/g,"</br>");
        },
        'click td.clickable': function(e) {
            Modal.show('onelogModal', function() {
                return Logs.find().fetch();
            });
        }
    }

    Template.chat_input.events = {
        'click button#submit': function(evt) {
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
    Meteor.startup(function() {
        Accounts.loginServiceConfiguration.remove({ service: 'google' });
        Accounts.loginServiceConfiguration.insert({
            service: 'google',
            clientId: Meteor.settings.private.google_api_id,
            secret: Meteor.settings.private.google_api_secret
        });
    });
    Accounts.validateNewUser(function(user) {
        if (Meteor.settings.private.restrict_domain) {
            if (user.services.google.email.indexOf(Meteor.settings.private.restrict_domain) != 1) {
                return true;
            }
            throw new Meteor.Error(403, "sorry,your account is not allowed");
        }
    });

    Picker.route('/get/token/', function(params, req, res, next) {
        var data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', Meteor.bindEnvironment(function(error, body) {
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
    Picker.route('/post/log/', function(params, req, res, next) {
        var data = '';
        req.on('data', (chunk) => {
            data += chunk;
        });

        req.on('end', Meteor.bindEnvironment(function(error, body) {
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
                    key: json.key,
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
    Picker.route('/get/log/summary/', function(params, req, res, next) {
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
                var textdata = '';
                //start
                textdata += "\n\n★実行中";
                for (var l of loglist.filter(a => a.info_type == 'Begin')) {
                    textdata += "\n" + l.name + "\n=> " + l.description;
                }
                //error
                textdata += "\n\n\n★エラー";
                for (var l of loglist.filter(a => a.info_type == 'Abend')) {
                    textdata += "\n" + l.name + "\n=> " + l.description;
                }
                //全体
                textdata += "\n\n\n★全体の状況";

                for (var l of loglist) {
                    textdata += "\n" + l.name + "\t" + l.info_type;
                }

                fs.writeFile(Meteor.rootPath + '\\temp\\writetest.txt', textdata, function(err) {
                    if (err) { console.log('writefile happens error :' + err); }
                    fs.readFile(Meteor.rootPath + '\\temp\\writetest.txt', (err, data) => {
                        if (err) { console.log('readfile happens error :' + err); }
                        res.writeHead(200,
                            {
                                'Content-Type': 'application/octet-stream',
                                'Content-Disposition': 'attachment; filename=download.txt'
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
