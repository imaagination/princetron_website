from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
                       url(r'^$', 'leaderboard.views.game'),
                       url(r'^leaderboard/$', 'leaderboard.views.leaders'),
                       url(r'^game/$', 'leaderboard.views.add_game'),
                       url(r'^admin/', include(admin.site.urls)),
                       url(r'^u/(?P<username>[-\w\.]+)/', 'leaderboard.views.user'),
                       url(r'^static/(?P<path>.*)$', 'django.views.static.serve', 
                        {'document_root': '/Users/andykaier/Documents/cos333/princetron_website/static'}),
                       )