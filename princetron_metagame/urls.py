from django.conf.urls import patterns, include, url
import os

SITE_ROOT = os.path.dirname(os.path.realpath(__file__))

# Uncomment the next two lines to enable the admin:
from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
                       url(r'^$', 'leaderboard.views.game'),
                       url(r'^leaderboard/$', 'leaderboard.views.leaders'),
                       url(r'^game/$', 'leaderboard.views.add_game'),
                       url(r'^admin/', include(admin.site.urls)),
                       url(r'^u/(?P<username>[-\w\.]+)/', 'leaderboard.views.user'),
                       url(r'^p/(?P<username>[-\w\.]+)/', 'leaderboard.views.profile'),
                       url(r'^static/(?P<path>.*)$', 'django.views.static.serve', 
                        {'document_root': os.path.join(SITE_ROOT, 'static')}),
                       )
