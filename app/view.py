#coding=utf-8
from flask import Flask,request,url_for,g,render_template,session,redirect,flash
from flask.ext.sqlalchemy import SQLAlchemy
from flask.ext.mail import Mail,Message
from threading import Thread
from werkzeug.utils import secure_filename
import os
import config
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI']="mysql://root:server@localhost/contact?charset=utf8"
app.config.from_object(config)
app.secret_key=app.config['SECERT_KEY']
db = SQLAlchemy(app)
mail = Mail(app)

UPLOAD_FOLDER = 'app/static/uploads'
@app.route("/upload",methods=['GET', 'POST'])
def upload():
    if request.method == 'GET':
        return render_template('news.html')
    elif request.method == 'POST':
        f = request.files['file']
        fname = secure_filename(f.filename)     #获取一个安全的文件名，且仅仅支持ascii字符；
        f.save(os.path.join(UPLOAD_FOLDER, fname))
        return 'success'
 
@app.route('/')
def index():
    return redirect(url_for('upload'), 302)
 



