from flask import Flask

# 直接把 docs 當作 static_root，方便和 GitHub Pages 共用同一份前端
app = Flask(__name__, static_folder="docs", static_url_path="")

@app.route("/")
def index():
    # 回傳 docs/index.html
    return app.send_static_file("index.html")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
