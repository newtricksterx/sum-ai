"""
URL configuration for backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.contrib import admin
from django.urls import path, include
from . import html

_admin_path = getattr(settings, "ADMIN_URL_PATH", "admin/")
if not _admin_path.endswith("/"):
    _admin_path += "/"

urlpatterns = [
    path(_admin_path, admin.site.urls),
    path('api/', include('api.urls')),
    path("accounts/", include("allauth.socialaccount.providers.google.urls")),
    path("accounts/social/", include("allauth.socialaccount.urls")),
    path("payments/", html.payments, name="payments"),
    path("billing/", html.billing_success, name="billing-success"),
    path("terms/", html.terms, name="terms"),
    path("privacy/", html.privacy, name="privacy"),
    path("study-tools/", html.study_tools, name="study-tools"),
    path("robots.txt", html.robots, name="robots"),
    path("sitemap.xml", html.sitemap_xml, name="sitemap"),
    path("llms.txt", html.llms_txt, name="llms"),
    path("", html.index, name="index"),
]

if settings.DEBUG:
    urlpatterns += [
        path("api-auth/", include("rest_framework.urls")),
    ]
