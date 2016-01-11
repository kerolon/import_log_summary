var Logs = new Mongo.Collection("logs");
var Comments = new Mongo.Collection("comments");
var Counters = new Mongo.Collection("counters");

if (Meteor.isClient) {
    
    // counter starts at 0
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
    Meteor.startup(function () {
        // code to run on server at startup        
    });
    JsonRoutes.add("post", "/post/log/", function (req, res, next) {

        var post = JSON.parse(req.body.result);
        Logs.insert({
            date: new Date(),
            info_type: post.info_type,
            category: post.category,
            name: post.name,
            sub_name: post.sub_name,
            description: post.description,
        });
        JsonRoutes.sendResult(res, {
            data: "ok"
        });
    });

}
