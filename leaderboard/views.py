from django.shortcuts import render_to_response
from django.core.context_processors import csrf
from leaderboard.models import Game, User
from datetime import datetime
import json, sys

def leaders(request):
    leaders = User.objects.all()
    users = [0]*10
    board = {}

    for leader in leaders:
        if leader.rank <= 10:
            users[leader.rank -  1] = leader.name


    board['users'] = users
    board_json = json.dumps(board)

    return render_to_response("base.json", {'data':board_json})

def add_game(request):
    if request.method == 'POST':
        data_dict = {}
        if request.POST['time'] and request.POST['losers'] and request.POST['winner']:
            data_dict['time'] = request.POST['time']
            date = data_dict['time']

            losers =  request.POST.getlist('losers')
            loser_objs = []
            data_dict['losers'] = losers
            highest_rank = sys.maxint


            winner = request.POST['winner']
            winner_obj, created = User.objects.get_or_create(name=winner)
            if created: #Created new
                prev_rank = sys.maxint
            else:
                prev_rank = winner_obj.rank


            for loser in losers:
                user, created = User.objects.get_or_create(name=loser)
                rank = len(User.objects.all())
                print created
                if created: #Created New
                    user.rank = rank
                    user.save()
                else:
                    highest_set = True
                    if user.rank < highest_rank:
                        highest_rank = user.rank
                    
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

            t = datetime.strptime(date, "%m/%d/%Y:%H:%M:%S")
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
        c.update(csrf(request))
        return render_to_response("form.html", c)

            
