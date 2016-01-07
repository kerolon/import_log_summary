var Logs = new Mongo.Collection("logs");
var Comments = new Mongo.Collection("comments");

if (Meteor.isClient) {
    
    // counter starts at 0
    $(window).load(function () {
        $('#chat-area')[0].style.display = 'none';
    });
    Template.body.helpers({
        //alert('hoge');
        logs: [
            { log_id: 0, date: new Date().toFormat('YYYY/MM/DD HH24:MI:SS'), info_type: 'complete1', category: 'import', name: 'someone', option: 'somewhere', description: 'somthing happened' },
            { log_id: 1, date: new Date().toFormat('YYYY/MM/DD HH24:MI:SS'), info_type: 'complete2', category: 'import', name: 'someone', option: 'somewhere', description: 'somthing happened' },
            { log_id: 2, date: new Date().toFormat('YYYY/MM/DD HH24:MI:SS'), info_type: 'complete3', category: 'import', name: 'someone', option: 'somewhere', description: 'somthing happened' },

        ],
        comments: function () {
            if (Session.get("selected_log_id")) {
                var comment = Comments.find({ "log_id": Session.get("selected_log_id") }).fetch();
                return comment.map((c) => {
                    return { date: c.date.toFormat('YYYY/MM/DD HH24:MI:SS'), name: c.name, text: c.text }
                });
            }
        }
    });

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
    JsonRoutes.add("get", "/posts/:id", function (req, res, next) {
        var id = req.params.id;
        JsonRoutes.sendResult(res,{
            data:'jhoge'
        });
    });
}
