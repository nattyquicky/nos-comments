from boa.interop.Neo.Runtime import Serialize, Deserialize, CheckWitness, Notify
from boa.interop.Neo.Storage import GetContext, Put, Delete, Get

get_all_ids = "GET_ALL_IDS"

# Check all existing post IDs to keep track
def check_allPostIds():
    all_posts = Get(GetContext(), get_all_ids)
    if not all_posts:
        Notify("[!] Creating all_posts object")
        all_posts = {}
        serialized = Serialize(all_posts)
        Put(GetContext(), get_all_ids, serialized)

def addPostId(postId, title):
    Notify("[!] Add PostID to all_posts object")
    serial = Get(GetContext(), get_all_ids)
    all_posts = Deserialize(serial)
    all_posts[postId] = title
    new_serial = Serialize(all_posts)
    Put(GetContext(), get_all_ids, new_serial)
    Notify("[!] Added PostID to all_posts object")

def removePostId(postId):
    Notify("[!] Remove PostID to all_posts object")
    serial = Get(GetContext(), get_all_ids)
    all_posts = Deserialize(serial)
    all_posts.remove(postId)
    new_serial = Serialize(all_posts)
    Put(GetContext(), get_all_ids, new_serial)
    Notify("[!] Removed PostID from all_posts object")


# Main Operation
#
def Main(operation, args):
    """
    Main definition for the smart contracts

    :param operation: the operation to be performed
    :type operation: str

    :param args: list of arguments.
        args[0] is always sender script hash
        args[1] is always post ID
        args[2] is comment content

    :return:
        byterarray: The result of the operation
    """

    # Am I who I say I am?
    user_hash = args[0]
    authorized = CheckWitness(user_hash)
    if not authorized:
        Notify("[!] Not Authorized")
        return False
    Notify("[+] Authorized")

    if operation == "GetPost" or operation == "RemovePost":
        if len(args) != 2:
            Notify("ERROR: Not enough arguments! Expecting: <user_hash> <post_id>")
            return False
        post_id = args[1]

    elif operation == "GetAllPosts":
        if len(args) != 1:
            Notify("ERROR: Too many arguments! Expecting: <user_hash>")
            return False

    elif operation == "Comment":
        if len(args) != 3:
            Notify("ERROR: Not enough arguments! Expecting: <user_hash> <post_id> <text>")
            return False
        post_id = args[1]
        comment = {
            "user": user_hash,
            "text": args[2] }
    
    else:
        if len(args) != 4:
            Notify("ERROR: Not enough arguments! Expecting: <user_hash> <post_id> <title> <text>")
            return False
        post_id = args[1]
        title = args[2]
        text = args[3]
        post = {
            "user": user_hash,
            "title": args[2],
            "text": args[3],
            "comments": [] }
            
    check_allPostIds()

    # Act based on requested operation
    if operation == "NewPost":
        Notify("DEBUG: NewPost")
        serial_post = Get(GetContext(), post_id)
        if serial_post:
            Notify("[!] Post with this ID already exists!")
            return False

        serial_post = Serialize(post)
        Put(GetContext(), post_id, serial_post)
        addPostId(post_id, post["title"])
        Notify("DEBUG: New post added")
        return True

    if operation == "Comment":
        Notify("DEBUG: Comment")
        serial_post = Get(GetContext(), post_id)
        if serial_post:
            deserial_post = Deserialize(serial_post)
            deserial_post["comments"].append(comment)
            tmp_post = Serialize(deserial_post)
            Put(GetContext(), post_id, tmp_post)
            Notify("DEBUG: New comment added")
            return True
        else:
            Notify("DEBUG: Post ID not found!")
            return False

    if operation == "RemovePost":
        Notify("DEBUG: Remove Post")
        serial_post = Get(GetContext(), post_id)
        if serial_post:
            deserial_post = Deserialize(serial_post)
            if deserial_post["user"] is user_hash:
                Delete(GetContext(), post_id)
                removePostId(post_id)
                Notify("DEBUG: Post removed")
                return True
            else:
                Notify("ERROR: You are not the OP.")
                return False
        else:
            Notify("ERROR: Post ID not found!")
            return False

    if operation == "GetPost":
        Notify("DEBUG: Get post")
        serial_post = Get(GetContext(), post_id)
        if serial_post:
            deserial_post = Deserialize(serial_post)
            return deserial_post 
        else:
            Notify("ERROR: Post ID not found!")
            return False

    if operation == "GetAllPosts":
        Notify("DEBUG: Get all posts")
        serial_all_posts = Get(GetContext(), get_all_ids)
        if serial_all_posts:
            all_posts = Deserialize(serial_all_posts)
            return all_posts
        else:
            Notify("ERROR: Post ID not found!")
            return False

    return False

