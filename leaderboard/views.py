from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render_to_response, get_object_or_404
from django.core.context_processors import csrf
from leaderboard.models import Game, User
from datetime import datetime
import json, sys

def game(request):
    return render_to_response("princetron.html", {'data':None})

def user(request, username):
    user = get_object_or_404(User, name=username)
    data = {}
    joined = user.joined_date
    data['rank'] = user.rank
    data['wins'] = user.wins
    data['losses'] = user.losses
    data['joined_month'] = joined.month
    data['joined_day'] = joined.day
    data['joined_year'] = joined.year

    data_json = json.dumps(data)
    return render_to_response("base.json", {'data':data_json})


def leaders(request):
    leaders = User.objects.all()
    users = [None]*10
    board = {}

    for leader in leaders:
        if leader.rank <= 10:
            users[leader.rank -  1] = leader.name


    board['users'] = users
    board_json = json.dumps(board)

    return render_to_response("base.json", {'data':board_json})

@csrf_exempt 
def add_game(request):
    if request.method == 'POST':
        data_dict = {}
        if request.POST['time'] and request.POST['losers'] and request.POST['winner']:
            data_dict['time'] = request.POST['time']
            date = data_dict['time']
            t = datetime.strptime(date, "%m/%d/%Y:%H:%M:%S")
            
            losers_str = request.POST['losers']
            losers = losers_str.split(',')
 #           print "Here is the split string:"
#            print losers.split(',')

            loser_objs = []
            data_dict['losers'] = losers
            highest_rank = sys.maxint
            highest_set = False

            winner = request.POST['winner']
            winner_obj, created = User.objects.get_or_create(name=winner)
            if created: #Created new
                winner_obj.wins = 1
                winner_obj.losses = 0
                winner_obj.joined_date = t
                prev_rank = sys.maxint
            else:
                winner_obj.wins += 1
                prev_rank = winner_obj.rank
            winner_obj.save()

            for loser in losers:
                print "Loser : " + loser
                user, created = User.objects.get_or_create(name=loser)
                rank = len(User.objects.all())
                print created
                if created: #Created New
                    user.rank = rank
                    user.wins = 0
                    user.losses = 1
                    user.joined_date = t
                else:
                    highest_set = True
                    user.losses += 1
                    if user.rank < highest_rank:
                        highest_rank = user.rank
                user.save()
                print user.rank


                loser_objs.append(user)

            if not highest_set:
                highest_rank = len(User.objects.all()) - len(losers)
            
            winner_obj.rank = min(highest_rank, prev_rank)
            winner_obj.save()

            # Adjust all others
            for user in User.objects.all():
                if user.name == winner:
                    continue
                if user.rank <= prev_rank and user.rank >= highest_rank and highest_set:
                    user.rank = user.rank + 1
                    user.save()
                
            for user in User.objects.all():
                print str(user) + " " + str(user.rank)

            data_dict['winner'] = winner


            game = Game.objects.create(end_time=t,winner=winner_obj)
            game.losers = loser_objs
            game.save()
            
        return render_to_response("base.json", {'data':str(data_dict)})
    else:
        c = {}
        users = []
        for user in User.objects.all():
            users.append(user)

        c['users'] = users
        #c.update(csrf(request))
        return render_to_response("form.html", c)

            
